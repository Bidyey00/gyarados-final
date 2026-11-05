
export default function Logo({ className = '' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Gyarados Logo"
      className={className}
    />
  );
}
