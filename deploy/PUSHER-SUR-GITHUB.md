# GitHub refuse l’import Origin → ce qu’il faut faire

L’erreur **« could not read Username for origin.cursor.com »** = le dépôt Cursor/Origin est **privé**. GitHub ne peut pas le télécharger tout seul.

## Méthode simple (depuis ton PC, avec Cursor)

### 1. Crée un dépôt vide sur GitHub

1. [github.com/new](https://github.com/new)
2. Nom : **`vintflow`**
3. **Ne coche pas** README / .gitignore
4. **Create repository**

### 2. Envoie le code depuis Cursor

1. Ouvre le projet **vintflow** dans **Cursor** (le même que l’agent).
2. Ouvre le **terminal** intégré (`Ctrl+` ` ou Terminal → New Terminal).
3. Copie-colle (remplace `TON_USER` par ton pseudo GitHub, ex. `eliopolidoro73-code`) :

```bash
git remote remove github 2>/dev/null
git remote add github https://github.com/TON_USER/vintflow.git
git pull origin main
git push -u github main
```

4. Une fenêtre **GitHub** s’ouvre → connecte-toi → autorise.

### 3. Brancher Vercel sur ce GitHub

1. [vercel.com/vint4/vintflow/settings/git](https://vercel.com/vint4/vintflow/settings/git)
2. **Disconnect** l’ancien dépôt si ce n’est pas le bon compte GitHub.
3. **Connect Git Repository** → choisis **`vintflow`** sur **`eliopolidoro73-code`** (ou ton compte).
4. Attends **Deployments** → **Ready**.

### 4. Vérifier Google

Ouvre : **https://vintflow-vint4.vercel.app/sitemap.xml**  
→ uniquement des URLs **`vintflow-vint4.vercel.app`**.

Search Console → sitemap → **`sitemap.xml`**.

## Méthode rapide sans GitHub (1 commande Vercel)

Si tu as **Vercel CLI** sur ton PC :

```bash
npm i -g vercel
cd chemin/vers/vintflow
vercel login
vercel --prod
```

Ça déploie le code local directement sur le projet **vintflow**.