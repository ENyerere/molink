/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'var(--radius-lg)',
  			'2xl': 'var(--radius-xl)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			surface: {
  				'1': 'hsl(var(--surface-1))',
  				'2': 'hsl(var(--surface-2))'
  			},
  			selection: 'hsl(var(--selection))',
  			link: 'hsl(var(--link))',
  			'destructive-soft': 'hsl(var(--destructive-soft))',
  			code: {
  				bg: 'hsl(var(--code-bg))',
  				fg: 'hsl(var(--code-fg))'
  			},
  			ld: {
  				bg: 'hsl(var(--ld-bg))',
  				fg: 'hsl(var(--ld-fg))',
  				muted: 'hsl(var(--ld-muted))',
  				card: 'hsl(var(--ld-card))',
  				border: 'hsl(var(--ld-border))'
  			}
  		},
  		boxShadow: {
  			'1': 'var(--shadow-1)',
  			'2': 'var(--shadow-2)',
  			'3': 'var(--shadow-3)'
  		},
  		// 字阶令牌：对齐《前端重设计方案 v2》的 10/11/13/15 语义档，替代散写的任意值
  		fontSize: {
  			micro: '10px',
  			caption: '11px',
  			'body-sm': '13px',
  			dialog: '15px'
  		},
  		// 层级令牌：50/60/70/80/100 五档语义化；z-0~40 保留默认值用于局部堆叠上下文
  		zIndex: {
  			dropdown: '50',
  			popover: '60',
  			modal: '70',
  			overlay: '80',
  			toast: '100'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
