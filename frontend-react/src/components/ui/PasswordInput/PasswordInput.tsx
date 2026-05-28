import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/Input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'iconLeft' | 'iconRight'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        iconLeft={<Lock className="h-4 w-4" aria-hidden />}
        iconRight={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-ink-400 hover:text-ink-700 transition-colors"
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            tabIndex={-1}
          >
            {visible
              ? <EyeOff className="h-4 w-4" aria-hidden />
              : <Eye    className="h-4 w-4" aria-hidden />
            }
          </button>
        }
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
