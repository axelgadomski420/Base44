# Landing — purrepets.pl

Statyczna strona landing z logo PURRE PETS (SVG). Aplikacja działa na bengos.pl — landing prowadzi do niej CTA.

## Wdrożenie (idempotentne)

```bash
sudo mkdir -p /var/www/purre-landing
sudo cp landing/* /var/www/purre-landing/
sudo nginx -t && sudo systemctl reload nginx
```

Nginx: serwer `purrepets.pl` /`www.purrepets.pl` serwuje `/var/www/purre-landing` (deploy/nginx.conf — blok dodany w 0.5.0).
DNS: rekord A `purrepets.pl` → 92.5.154.243 (+ CNAME www), potem `certbot --nginx -d purrepets.pl -d www.purrepets.pl`.
