import { Bloom, EffectComposer, GodRays, ToneMapping } from '@react-three/postprocessing'
import { KernelSize, ToneMappingMode } from 'postprocessing'
import { useControls } from 'leva'
import type { Mesh } from 'three'

/**
 * The post stack. Selectivity rule (DESIGN.md §9): the star's shader
 * outputs HDR (> 1.0); bloom's luminance threshold sits at ~1 so ONLY
 * HDR emitters glow — never the whole frame. Tone mapping happens here
 * (Canvas is `flat`), so it is applied exactly once, after all effects.
 */
export function Effects({ sun }: { sun: Mesh }) {
  const p = useControls('post', {
    bloomThreshold: { value: 1.05, min: 0, max: 2, step: 0.01 },
    bloomIntensity: { value: 0.45, min: 0, max: 3, step: 0.05 },
    bloomRadius: { value: 0.65, min: 0.1, max: 1, step: 0.01 },
    godraysWeight: { value: 0.05, min: 0, max: 1, step: 0.01 },
    godraysExposure: { value: 0.1, min: 0, max: 1, step: 0.01 },
    godraysDecay: { value: 0.97, min: 0.7, max: 1, step: 0.005 },
  })

  const godrays = true // earlier "black screen" was the hidden preview tab, not GodRays

  return (
    <EffectComposer multisampling={0}>
      {godrays ? (
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
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
