import type * as React from 'react'

function nameColorStyle(
  primary: string | null | undefined,
  secondary: string | null | undefined,
  fallback: string,
): React.CSSProperties {
  if (primary && secondary) {
    return {
      backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})`,
      backgroundClip: 'text',
      color: 'transparent',
    }
  }
  return { color: primary ?? fallback }
}

export function Profile(
  username: string,
  avatar: string,
  usernameColor?: string | null,
  usernameColorSecondary?: string | null,
  icon?: string | null,
) {
  const lightNameStyle = nameColorStyle(usernameColor, usernameColorSecondary, '#060607')
  const darkNameStyle = nameColorStyle(usernameColor, usernameColorSecondary, '#F2F3F5')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          width: '783px',
          height: '200px',
          alignItems: 'center',
          paddingLeft: '48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderRadius: '50%',
            width: '120px',
            height: '120px',
            overflow: 'hidden',
          }}
        >
          <img src={avatar} alt={username} style={{ width: '120px', height: '120px' }} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: '32px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            <p
              style={{
                fontSize: '48px',
                fontWeight: 500,
                lineHeight: 1,
                marginTop: 0,
                marginBottom: 0,
                fontFamily: 'Inter',
                ...lightNameStyle,
              }}
            >
              {username}
            </p>
            {icon ? <img style={{ width: 42, height: 42 }} src={icon} alt="icon" /> : null}
          </div>
          <p
            style={{
              fontSize: '48px',
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 0,
              marginBottom: 0,
              color: '#2E3339',
              fontFamily: 'Inter',
            }}
          >
            rocks are really old
          </p>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexDirection: 'row',
          backgroundColor: '#313339',
          width: '783px',
          height: '200px',
          alignItems: 'center',
          paddingLeft: '48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderRadius: '50%',
            width: '120px',
            height: '120px',
            overflow: 'hidden',
          }}
        >
          <img src={avatar} alt={username} style={{ width: '120px', height: '120px' }} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: '32px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            <p
              style={{
                fontSize: '48px',
                fontWeight: 500,
                lineHeight: 1,
                marginTop: 0,
                marginBottom: 0,
                fontFamily: 'Inter',
                ...darkNameStyle,
              }}
            >
              {username}
            </p>
            {icon ? <img style={{ width: 42, height: 42 }} src={icon} alt="icon" /> : null}
          </div>
          <p
            style={{
              fontSize: '48px',
              fontWeight: 500,
              lineHeight: 1,
              marginTop: 0,
              marginBottom: 0,
              color: '#DCDDDE',
              fontFamily: 'Inter',
            }}
          >
            rocks are really old
          </p>
        </div>
      </div>
    </div>
  )
}

export const profileCardOptions = {
  width: 783,
  height: 400,
} as const
