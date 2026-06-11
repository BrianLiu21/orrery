import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  GodRays,
  Noise,
  SMAA,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, KernelSize, ToneMappingMode } from 'postprocessing'
import { useControls } from 'leva'
import { type Mesh, Vector3 } from 'three'
import { useUiStore } from '../state/useUiStore'
import { planetPositions } from '../state/planetPositions'

const ORIGIN = new Vector3(0, 0, 0)

/**
 * The post stack. Selectivity rule (DESIGN.md §9): the star's shader
 * outputs HDR (> 1.0); bloom's luminance threshold sits at ~1 so ONLY
 * HDR emitters glow — never the whole frame. Tone mapping happens here
 * (Canvas is `flat`), so it is applied exactly once, after all effects;
 * SMAA runs last, on the tone-mapped frame.
 *
 * Depth of field locks focus to the selected planet and eases home to
 * the star on deselect.
 */
export function Effects({ sun }: { sun: Mesh }) {
  const p = useControls('post', {
    bloomThreshold: { value: 1.05, min: 0, max: 2, step: 0.01 },
    bloomIntensity: { value: 0.45, min: 0, max: 3, step: 0.05 },
    bloomRadius: { value: 0.65, min: 0.1, max: 1, step: 0.01 },
    godraysWeight: { value: 0.05, min: 0, max: 1, step: 0.01 },
    godraysExposure: { value: 0.1, min: 0, max: 1, step: 0.01 },
    godraysDecay: { value: 0.97, min: 0.7, max: 1, step: 0.005 },
    dofEnabled: { value: true, label: 'depth of field' },
    bokehScale: { value: 2.4, min: 0, max: 8, step: 0.1 },
    focusRange: { value: 55, min: 5, max: 200, step: 1 },
    aberration: { value: 0.0011, min: 0, max: 0.01, step: 0.0001 },
    grain: { value: 0.06, min: 0, max: 0.3, step: 0.01 },
    vignetteDarkness: { value: 0.62, min: 0, max: 1.5, step: 0.01 },
    toneMapping: {
      value: ToneMappingMode.ACES_FILMIC,
      options: { ACES: ToneMappingMode.ACES_FILMIC, AgX: ToneMappingMode.AGX },
    },
  })

  // DoF focus target: eased toward the selected planet, home = the star.
  const focusTarget = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const sel = useUiStore.getState().selectedTaskId
    const pos = (sel && planetPositions.get(sel)) || ORIGIN
    focusTarget.lerp(pos, 0.08)
  })

  return (
    <EffectComposer multisampling={0}>
      <GodRays
        sun={sun}
        samples={48}
        density={0.96}
        decay={p.godraysDecay}
        weight={p.godraysWeight}
        exposure={p.godraysExposure}
        clampMax={0.22}
        kernelSize={KernelSize.SMALL}
        blur
      />
      {p.dofEnabled ? (
        <DepthOfField
          target={focusTarget}
          worldFocusRange={p.focusRange}
          bokehScale={p.bokehScale}
        />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={p.bloomThreshold}
        luminanceSmoothing={0.25}
        intensity={p.bloomIntensity}
        radius={p.bloomRadius}
      />
      <ChromaticAberration offset={[p.aberration, p.aberration * 0.6]} radialModulation modulationOffset={0.4} />
      <Vignette eskil={false} offset={0.3} darkness={p.vignetteDarkness} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={p.grain} />
      <ToneMapping mode={p.toneMapping} />
      <SMAA />
    </EffectComposer>
  )
}
