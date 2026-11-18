# Secret Gift

Tirages au sort secrets (Secret Santa…). Le créateur ajoute les participants et envoie à chacun son
lien personnel. Chaque participant glisse le doigt vers la gauche pour découvrir la personne à qui
il offre un cadeau. Le créateur suit en direct qui a ouvert son lien et qui a découvert son tirage.

- **SvelteKit** (adapter-node) + **SQLite** (`better-sqlite3`), un seul conteneur
- Suivi en direct via Server-Sent Events
- Thèmes : Noël et Soirée
- Exclusions (ex. un couple ne se tire pas), budget, date d’échange
- Le tirage cherche une seule grande boucle (pas d’échanges à deux) quand c’est possible
- Aucun compte : le créateur reçoit un lien d’administration secret (seul son hash est stocké)
- Le créateur ne voit jamais qui a tiré qui
- Relancer le tirage remplace tous les liens ; les anciens affichent « lien expiré »

## Déploiement avec Caddy (Docker)

Prérequis : ton conteneur Caddy est branché sur un réseau Docker (ici `caddy`).

```bash
git clone <ce dépôt> secret-gift && cd secret-gift
cp .env.example .env   # renseigne ORIGIN et le nom du réseau Caddy
docker compose up -d --build
```

Ajoute ensuite au Caddyfile (voir `Caddyfile.example`) :

```
tirage.example.com {
	encode zstd gzip
	reverse_proxy secret-gift:3000
}
```

puis recharge Caddy (`docker exec <caddy> caddy reload --config /etc/caddy/Caddyfile`).

Pas de réseau Docker commun ? Remplace la section `networks` par
`ports: ["127.0.0.1:3000:3000"]` et utilise `reverse_proxy 127.0.0.1:3000`.

`ORIGIN` doit être l’URL publique exacte (avec `https://`), sinon les formulaires sont refusés.

La base SQLite est créée automatiquement au démarrage, dans le volume Docker `secret-gift-data`.
Rien à préparer : le volume est créé par `docker compose up` avec les bons droits.

Sauvegarde (copie cohérente, même pendant que l’app tourne) :

```bash
docker exec secret-gift node -e "require('better-sqlite3')('/data/secret-gift.db').backup('/data/backup.db').then(()=>console.log('ok'))"
docker cp secret-gift:/data/backup.db ./secret-gift-backup.db
```

Tu préfères un dossier visible sur l’hôte (`./data`) ? Remplace le volume par `./data:/data`
et donne d’abord ce dossier à l’utilisateur du conteneur : `mkdir -p data && sudo chown 1000:1000 data`.

## Développement

```bash
npm install
npm run dev
npm test        # tests de l’algorithme de tirage
npm run check   # vérification des types
```
