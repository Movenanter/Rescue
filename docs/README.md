# Rescue CPR Documentation

This is the official documentation site for Rescue CPR - an AI-powered CPR guidance system for Mentra smart glasses.

## Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/rescue-cpr/tree/main/docs)

### Option 2: Manual Deploy

1. Install dependencies:
```bash
cd docs
npm install
```

2. Build the site:
```bash
npm run build
```

3. Deploy to Vercel:
```bash
npx vercel
```

Follow the prompts to deploy. The site will be available at a URL like:
`https://rescue-docs.vercel.app`

## Local Development

Run the documentation site locally:

```bash
npm run dev
```

Visit http://localhost:3000 to see the documentation.

## Customization

- Update GitHub links in `app/page.tsx`
- Modify colors in `tailwind.config.js`
- Add new sections in the component functions
- Update API documentation as endpoints change

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide Icons
- Vercel hosting