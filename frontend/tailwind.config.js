/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      // Primary colors
      primary: {
        50: 'var(--color-primary-50)',
        100: 'var(--color-primary-100)',
        200: 'var(--color-primary-200)',
        300: 'var(--color-primary-300)',
        400: 'var(--color-primary-400)',
        500: 'var(--color-primary-500)',
        600: 'var(--color-primary-600)',
        700: 'var(--color-primary-700)',
        800: 'var(--color-primary-800)',
        900: 'var(--color-primary-900)',
      },
      
      // Secondary colors
      secondary: {
        50: 'var(--color-secondary-50)',
        100: 'var(--color-secondary-100)',
        200: 'var(--color-secondary-200)',
        300: 'var(--color-secondary-300)',
        400: 'var(--color-secondary-400)',
        500: 'var(--color-secondary-500)',
        600: 'var(--color-secondary-600)',
        700: 'var(--color-secondary-700)',
        800: 'var(--color-secondary-800)',
        900: 'var(--color-secondary-900)',
      },
      
      // Semantic colors
      success: {
        50: 'var(--color-success-50)',
        100: 'var(--color-success-100)',
        200: 'var(--color-success-200)',
        300: 'var(--color-success-300)',
        400: 'var(--color-success-400)',
        500: 'var(--color-success-500)',
        600: 'var(--color-success-600)',
        700: 'var(--color-success-700)',
        800: 'var(--color-success-800)',
        900: 'var(--color-success-900)',
      },
      
      warning: {
        50: 'var(--color-warning-50)',
        100: 'var(--color-warning-100)',
        200: 'var(--color-warning-200)',
        300: 'var(--color-warning-300)',
        400: 'var(--color-warning-400)',
        500: 'var(--color-warning-500)',
        600: 'var(--color-warning-600)',
        700: 'var(--color-warning-700)',
        800: 'var(--color-warning-800)',
        900: 'var(--color-warning-900)',
      },
      
      error: {
        50: 'var(--color-error-50)',
        100: 'var(--color-error-100)',
        200: 'var(--color-error-200)',
        300: 'var(--color-error-300)',
        400: 'var(--color-error-400)',
        500: 'var(--color-error-500)',
        600: 'var(--color-error-600)',
        700: 'var(--color-error-700)',
        800: 'var(--color-error-800)',
        900: 'var(--color-error-900)',
      },
      
      info: {
        50: 'var(--color-info-50)',
        100: 'var(--color-info-100)',
        200: 'var(--color-info-200)',
        300: 'var(--color-info-300)',
        400: 'var(--color-info-400)',
        500: 'var(--color-info-500)',
        600: 'var(--color-info-600)',
        700: 'var(--color-info-700)',
        800: 'var(--color-info-800)',
        900: 'var(--color-info-900)',
      },
      
      // Neutral colors
      neutral: {
        0: 'var(--color-neutral-0)',
        50: 'var(--color-neutral-50)',
        100: 'var(--color-neutral-100)',
        200: 'var(--color-neutral-200)',
        300: 'var(--color-neutral-300)',
        400: 'var(--color-neutral-400)',
        500: 'var(--color-neutral-500)',
        600: 'var(--color-neutral-600)',
        700: 'var(--color-neutral-700)',
        800: 'var(--color-neutral-800)',
        900: 'var(--color-neutral-900)',
        950: 'var(--color-neutral-950)',
      },
      
      // Semantic colors
      background: 'var(--color-background)',
      foreground: 'var(--color-foreground)',
      surface: 'var(--color-surface)',
      'surface-variant': 'var(--color-surface-variant)',
      border: 'var(--color-border)',
      'border-strong': 'var(--color-border-strong)',
      
      // Text colors
      'text-primary': 'var(--color-text-primary)',
      'text-secondary': 'var(--color-text-secondary)',
      'text-muted': 'var(--color-text-muted)',
      'text-disabled': 'var(--color-text-disabled)',
    },
    
    fontFamily: {
      sans: 'var(--font-family-sans)',
      mono: 'var(--font-family-mono)',
      serif: 'var(--font-family-serif)',
    },
    
    fontSize: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      lg: 'var(--font-size-lg)',
      xl: 'var(--font-size-xl)',
      '2xl': 'var(--font-size-2xl)',
      '3xl': 'var(--font-size-3xl)',
      '4xl': 'var(--font-size-4xl)',
      '5xl': 'var(--font-size-5xl)',
      '6xl': 'var(--font-size-6xl)',
    },
    
    fontWeight: {
      thin: 'var(--font-weight-thin)',
      light: 'var(--font-weight-light)',
      normal: 'var(--font-weight-normal)',
      medium: 'var(--font-weight-medium)',
      semibold: 'var(--font-weight-semibold)',
      bold: 'var(--font-weight-bold)',
      extrabold: 'var(--font-weight-extrabold)',
      black: 'var(--font-weight-black)',
    },
    
    lineHeight: {
      none: 'var(--line-height-none)',
      tight: 'var(--line-height-tight)',
      snug: 'var(--line-height-snug)',
      normal: 'var(--line-height-normal)',
      relaxed: 'var(--line-height-relaxed)',
      loose: 'var(--line-height-loose)',
    },
    
    letterSpacing: {
      tighter: 'var(--letter-spacing-tighter)',
      tight: 'var(--letter-spacing-tight)',
      normal: 'var(--letter-spacing-normal)',
      wide: 'var(--letter-spacing-wide)',
      wider: 'var(--letter-spacing-wider)',
      widest: 'var(--letter-spacing-widest)',
    },
    
    spacing: {
      0: 'var(--space-0)',
      1: 'var(--space-1)',
      2: 'var(--space-2)',
      3: 'var(--space-3)',
      4: 'var(--space-4)',
      5: 'var(--space-5)',
      6: 'var(--space-6)',
      8: 'var(--space-8)',
      10: 'var(--space-10)',
      12: 'var(--space-12)',
      16: 'var(--space-16)',
      20: 'var(--space-20)',
      24: 'var(--space-24)',
      32: 'var(--space-32)',
      40: 'var(--space-40)',
      48: 'var(--space-48)',
      56: 'var(--space-56)',
      64: 'var(--space-64)',
    },
    
    borderRadius: {
      none: 'var(--radius-none)',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-base)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      xl: 'var(--radius-xl)',
      '2xl': 'var(--radius-2xl)',
      '3xl': 'var(--radius-3xl)',
      full: 'var(--radius-full)',
    },
    
    boxShadow: {
      sm: 'var(--shadow-sm)',
      DEFAULT: 'var(--shadow-base)',
      md: 'var(--shadow-md)',
      lg: 'var(--shadow-lg)',
      xl: 'var(--shadow-xl)',
      '2xl': 'var(--shadow-2xl)',
      inner: 'var(--shadow-inner)',
    },
    
    transitionDuration: {
      fast: 'var(--transition-fast)',
      DEFAULT: 'var(--transition-base)',
      slow: 'var(--transition-slow)',
      slower: 'var(--transition-slower)',
    },
    
    transitionTimingFunction: {
      linear: 'var(--ease-linear)',
      in: 'var(--ease-in)',
      out: 'var(--ease-out)',
      'in-out': 'var(--ease-in-out)',
    },
    
    screens: {
      sm: 'var(--breakpoint-sm)',
      md: 'var(--breakpoint-md)',
      lg: 'var(--breakpoint-lg)',
      xl: 'var(--breakpoint-xl)',
      '2xl': 'var(--breakpoint-2xl)',
    },
    
    zIndex: {
      dropdown: 'var(--z-index-dropdown)',
      sticky: 'var(--z-index-sticky)',
      fixed: 'var(--z-index-fixed)',
      'modal-backdrop': 'var(--z-index-modal-backdrop)',
      modal: 'var(--z-index-modal)',
      popover: 'var(--z-index-popover)',
      tooltip: 'var(--z-index-tooltip)',
      toast: 'var(--z-index-toast)',
    },
    
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      
      // Component-specific heights
      height: {
        'button-sm': 'var(--button-height-sm)',
        'button-md': 'var(--button-height-md)',
        'button-lg': 'var(--button-height-lg)',
        'input-sm': 'var(--input-height-sm)',
        'input-md': 'var(--input-height-md)',
        'input-lg': 'var(--input-height-lg)',
      },
      
      minHeight: {
        'button-sm': 'var(--button-height-sm)',
        'button-md': 'var(--button-height-md)',
        'button-lg': 'var(--button-height-lg)',
        'input-sm': 'var(--input-height-sm)',
        'input-md': 'var(--input-height-md)',
        'input-lg': 'var(--input-height-lg)',
      },
      
      // Focus ring utilities
      outlineWidth: {
        focus: 'var(--focus-ring-width)',
      },
      
      outlineColor: {
        focus: 'var(--focus-ring-color)',
      },
      
      outlineOffset: {
        focus: 'var(--focus-ring-offset)',
      },
    },
  },
  plugins: [
    // Plugin for focus ring utilities
    function({ addUtilities, theme }) {
      const focusRingUtilities = {
        '.focus-ring': {
          outlineWidth: 'var(--focus-ring-width)',
          outlineStyle: 'solid',
          outlineColor: 'var(--focus-ring-color)',
          outlineOffset: 'var(--focus-ring-offset)',
        },
        '.focus-ring-primary': {
          '--focus-ring-color': 'var(--color-primary-500)',
        },
        '.focus-ring-secondary': {
          '--focus-ring-color': 'var(--color-secondary-500)',
        },
        '.focus-ring-success': {
          '--focus-ring-color': 'var(--color-success-500)',
        },
        '.focus-ring-warning': {
          '--focus-ring-color': 'var(--color-warning-500)',
        },
        '.focus-ring-error': {
          '--focus-ring-color': 'var(--color-error-500)',
        },
        '.focus-ring-info': {
          '--focus-ring-color': 'var(--color-info-500)',
        },
      };
      
      addUtilities(focusRingUtilities);
    },
    
    // Plugin for component variants
    function({ addComponents, theme }) {
      const componentVariants = {
        // Button variants
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          borderRadius: 'var(--radius-md)',
          fontWeight: 'var(--font-weight-medium)',
          transitionProperty: 'colors, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
          transitionDuration: 'var(--transition-base)',
          transitionTimingFunction: 'var(--ease-in-out)',
          cursor: 'pointer',
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
          '&:focus-visible': {
            outline: '2px solid #3b82f6',
            outlineOffset: '2px',
          },
        },
        
        // Input variants
        '.input': {
          display: 'block',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          borderWidth: '1px',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-base)',
          lineHeight: 'var(--line-height-normal)',
          transitionProperty: 'colors, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
          transitionDuration: 'var(--transition-base)',
          transitionTimingFunction: 'var(--ease-in-out)',
          '&:focus': {
            outline: 'none',
            borderColor: 'var(--color-primary-500)',
            boxShadow: '0 0 0 1px var(--color-primary-500)',
          },
          '&:disabled': {
            backgroundColor: 'var(--color-neutral-100)',
            color: 'var(--color-text-disabled)',
            cursor: 'not-allowed',
          },
          '&::placeholder': {
            color: 'var(--color-text-muted)',
          },
        },
        
        // Card variants
        '.card': {
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-base)',
          border: '1px solid var(--color-border)',
          padding: 'var(--space-6)',
          transitionProperty: 'colors, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
          transitionDuration: 'var(--transition-base)',
          transitionTimingFunction: 'var(--ease-in-out)',
        },
        
        // Badge variants
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-medium)',
          lineHeight: 'var(--line-height-none)',
          padding: 'var(--space-1) var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--letter-spacing-wide)',
        },
      };
      
      addComponents(componentVariants);
    },
  ],
}