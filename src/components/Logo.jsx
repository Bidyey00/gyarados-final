export default function Logo({ className = 'h-10 w-10' }) {
  // Decorative: the site name always sits next to it
  return <img src="/logo.png" alt="" className={className} />;
}
