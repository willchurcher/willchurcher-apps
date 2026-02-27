Check the Vercel deployment status for an app in this monorepo.

The app name is provided as an argument: $ARGUMENTS

## Steps

1. Check if the Vercel CLI is installed: run `vercel --version`
   - If not installed, tell the user: "Run `npm i -g vercel` then `vercel login` to set up the CLI."

2. If installed, run: `vercel ls --scope willchurcher 2>&1 | head -40`
   to list recent deployments and find ones matching $ARGUMENTS.

3. Also try: `vercel inspect $(vercel ls --scope willchurcher 2>&1 | grep "$ARGUMENTS" | head -1 | awk '{print $2}') 2>&1`

4. Report to the user:
   - Latest deployment URL
   - Status (Ready / Building / Error)
   - When it was deployed
   - Link to the live app: `https://$ARGUMENTS.willchurcher.com`

5. If Vercel CLI is not set up, suggest checking https://vercel.com/willchurcher as an alternative.
