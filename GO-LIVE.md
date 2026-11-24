# Putting the homepage live at cedlabs.net

Nothing has been deployed and no DNS has changed.

## Build

Run `npm run build`. It needs Node and no packages. Publish the generated `dist` folder.

To review it locally, run `npm run preview` and open http://localhost:4173. This simple preview does not apply the security headers below.

## Clean URLs

Each project is a real file, such as `dist/tracklog/index.html`, so **no rewrite rules are needed**.

- `cedlabs.net/tracklog` redirects to `cedlabs.net/tracklog/` and loads directly, including on refresh. Cloudflare Pages and default nginx both do this.
- `dist/404.html` is the not-found page. Cloudflare Pages uses it automatically. On nginx, add `error_page 404 /404.html;`.
- The site must be served from the root of the domain, because its pages load assets from paths like `/styles.css`.

## Security headers

**Cloudflare Pages:** nothing extra to do. The build puts a `_headers` file in `dist`, and Pages applies it to every page.

**nginx:** `_headers` has no effect there, so add this to the HTTPS `server` block for `cedlabs.net`. If a `location` block has its own `add_header`, it stops inheriting these, so repeat them there.

```nginx
root /var/www/cedlabs/dist; # Change to where dist is uploaded
index index.html;
absolute_redirect off;
error_page 404 /404.html;

add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

location = /_headers { return 404; }
location / { try_files $uri $uri/ =404; }
```

Run `sudo nginx -t` before reloading. This snippet has not been run on your server.

## Social previews

Each page has a 1200x630 preview image from `dist/og`, with absolute `https://cedlabs.net/og/...` URLs. Discord and other apps can only fetch them once `cedlabs.net` is public, so they will not appear while the Access login is on. Discord also caches previews, so a link shared before launch may need a moment or a changed URL to refresh.

## Steps

1. **Check what the Cloudflare Access login on `cedlabs.net` protects.** The domain currently redirects every visitor to that login. Move anything private to another hostname first.
2. **Host the site.** The domain is already on Cloudflare, so Cloudflare Pages is the simplest choice. Use `npm run build` as the build command and `dist` as the output folder, then attach `cedlabs.net` as the custom domain. Your existing nginx server would also work.
3. **Remove or change the Access application for `cedlabs.net`.** Until then, the public cannot see the site. Check that no Access rule still covers `/tracklog` or `/areasurvival`.
4. **Optional:** add `www.cedlabs.net` and redirect it to `cedlabs.net`. It has no DNS record today.

## Adding a site later

Add one entry to `sites.js`, run `npm run og` to make its preview image, then run `npm run build`. The homepage area, `/<slug>/` page, navigation, footer links, social tags and sitemap entry are all generated from it. `npm run og` needs Chrome or Edge on your PC, and the finished images are kept in `src/og`, so the host does not need a browser.

## Worth fixing

`areasurvival.cedlabs.net` is the correct Minecraft address, but opening it in a web browser shows the default "Welcome to nginx" page over HTTP and a certificate error over HTTPS. Redirecting both to `https://status-areasurvival.cedlabs.net` would fix that. The HTTPS redirect needs a certificate that covers `areasurvival.cedlabs.net`.
