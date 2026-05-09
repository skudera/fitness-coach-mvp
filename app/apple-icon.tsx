import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: '#020617',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          color: '#10b981',
          fontSize: 72,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: '-3px',
          lineHeight: 1,
        }}
      >
        FC
      </div>
      <div
        style={{
          width: 40,
          height: 3,
          background: '#10b981',
          borderRadius: 2,
          opacity: 0.6,
        }}
      />
    </div>,
    { ...size }
  )
}
