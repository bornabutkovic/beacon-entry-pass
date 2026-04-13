interface ConwayoLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  textClass?: string;
}

const ConwayoLogo = ({ size = 32, showText = true, subtitle, textClass = '' }: ConwayoLogoProps) => {
  const id = `grad-${size}`;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path
          d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20c2.5 0 4.9-.46 7.1-1.3"
          stroke={`url(#${id})`}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M38 12a16 16 0 0 0-14-4"
          stroke={`url(#${id})`}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className={`font-bold tracking-[0.2em] text-white font-[Poppins] ${textClass}`}>
              CONWAYO
            </span>
            {subtitle && (
              <span className="text-muted-foreground text-sm font-medium">{subtitle}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConwayoLogo;
