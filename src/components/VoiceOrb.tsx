import { cn } from "@/lib/utils";
import { MicOff } from "lucide-react";

interface VoiceOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isMuted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onToggleMute?: () => void;
}

export function VoiceOrb({ 
  isActive, 
  isSpeaking, 
  isListening, 
  isMuted = false, 
  size = 'lg',
  onToggleMute 
}: VoiceOrbProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const isClickable = isActive && onToggleMute;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings */}
      {isActive && !isMuted && (
        <>
          <div 
            className={cn(
              "absolute rounded-full border-2 border-primary/30 animate-ping",
              sizeClasses[size]
            )}
            style={{ animationDuration: '2s' }}
          />
          <div 
            className={cn(
              "absolute rounded-full border border-primary/20 animate-ping",
              size === 'lg' ? 'w-40 h-40' : size === 'md' ? 'w-32 h-32' : 'w-24 h-24'
            )}
            style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
          />
        </>
      )}
      
      {/* Main orb */}
      <button
        type="button"
        onClick={isClickable ? onToggleMute : undefined}
        disabled={!isClickable}
        className={cn(
          "relative rounded-full border-2 flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          isMuted ? "border-muted-foreground/50" : "border-primary",
          isActive && !isMuted && "bg-primary/10",
          isMuted && "bg-muted/30",
          isSpeaking && !isMuted && "bg-primary/20 scale-110",
          isListening && !isMuted && "bg-primary/5",
          isClickable && "cursor-pointer hover:scale-105 active:scale-95"
        )}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
      >
        {/* Muted indicator */}
        {isMuted ? (
          <MicOff className={cn(
            "text-muted-foreground",
            size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-8 h-8' : 'w-5 h-5'
          )} />
        ) : (
          <>
            {/* Inner indicator */}
            <div 
              className={cn(
                "rounded-full transition-all duration-300",
                size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4',
                "bg-primary",
                isSpeaking && "animate-pulse scale-125",
                isListening && "opacity-50"
              )}
            />
            
            {/* Speaking indicator bars */}
            {isSpeaking && (
              <div className="absolute inset-0 flex items-center justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 20}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.5s'
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </button>
      
      {/* Status text */}
      <div className="absolute -bottom-8 text-sm font-mono text-muted-foreground">
        {isMuted ? 'Tap to unmute' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : isActive ? 'Tap to mute' : ''}
      </div>
    </div>
  );
}
