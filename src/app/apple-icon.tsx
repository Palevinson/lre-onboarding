import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1e3d6b 0%, #030712 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            background: '#f59e0b',
            borderRadius: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1e3d6b"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div
          style={{
            marginTop: 11,
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          LRE
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            fontWeight: 600,
            color: '#f59e0b',
            letterSpacing: 2.5,
            lineHeight: 1,
          }}
        >
          ONBOARDING
        </div>
      </div>
    ),
    size
  )
}
