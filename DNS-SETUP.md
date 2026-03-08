# DNS Setup for darkcli.dev

## Overview

This document describes the DNS configuration required to point `darkcli.dev` to the Vercel deployment. DNS is managed via GoDaddy.

## Required DNS Records

### A Record (root domain)

| Type | Name | Value        | TTL  |
|------|------|-------------|------|
| A    | @    | 76.76.21.21 | 600  |

This points the root domain `darkcli.dev` to Vercel's anycast IP address.

### CNAME Record (www subdomain)

| Type  | Name | Value                  | TTL  |
|-------|------|------------------------|------|
| CNAME | www  | cname.vercel-dns.com   | 600  |

This points `www.darkcli.dev` to Vercel's DNS, which handles the redirect to the root domain.

## GoDaddy CLI Setup

Install [godaddy-cli](https://github.com/cabamo/godaddy-cli):

```bash
npm install -g godaddy-cli
```

Configure with your API key:

```bash
godaddy-cli configure --key YOUR_API_KEY --secret YOUR_API_SECRET
```

Set the DNS records:

```bash
# A record for root domain
godaddy-cli records set darkcli.dev A @ 76.76.21.21 --ttl 600

# CNAME for www
godaddy-cli records set darkcli.dev CNAME www cname.vercel-dns.com --ttl 600
```

## Vercel Custom Domain

Add the domain in Vercel project settings:

1. Go to Project Settings → Domains
2. Add `darkcli.dev`
3. Add `www.darkcli.dev` (Vercel will auto-redirect to root)
4. Vercel auto-provisions SSL certificates via Let's Encrypt

## Verification Steps

### 1. Verify DNS Propagation

After setting records, check propagation:

```bash
# Check A record
dig darkcli.dev A +short
# Expected: 76.76.21.21

# Check CNAME record
dig www.darkcli.dev CNAME +short
# Expected: cname.vercel-dns.com.

# Or use nslookup
nslookup darkcli.dev
nslookup www.darkcli.dev
```

You can also use [dnschecker.org](https://dnschecker.org) to verify global propagation.

DNS propagation typically takes 5-30 minutes but can take up to 48 hours.

### 2. Verify HTTPS

Once DNS has propagated:

```bash
# Check HTTPS certificate
curl -vI https://darkcli.dev 2>&1 | grep -E "(SSL|subject|issuer|expire)"

# Verify redirect from www
curl -I https://www.darkcli.dev
# Expected: 301/308 redirect to https://darkcli.dev
```

### 3. Verify Page Loads

```bash
# Check HTTP status
curl -o /dev/null -s -w "%{http_code}" https://darkcli.dev
# Expected: 200

# Check content
curl -s https://darkcli.dev | grep -i "dark factory"
```

## Troubleshooting

- **DNS not propagating**: Wait up to 48 hours. Check for conflicting records in GoDaddy.
- **SSL errors**: Vercel auto-provisions SSL after DNS verification. Allow 10-15 minutes.
- **www not redirecting**: Ensure CNAME is set to `cname.vercel-dns.com` (not the Vercel app URL).
- **404 errors**: Verify `vercel.json` outputDirectory matches the build output path.
