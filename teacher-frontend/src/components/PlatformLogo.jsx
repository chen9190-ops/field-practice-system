import logoUrl from '../assets/teacher-ui/platform-logo-256.png'

export default function PlatformLogo({ className = '' }) {
  return <img className={`platform-logo ${className}`} src={logoUrl} alt="" aria-hidden="true" />
}
