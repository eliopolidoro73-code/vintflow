# GitHub refuse l’import Origin → ce qu’il faut faire

L’erreur **« could not read Username for origin.cursor.com »** = le dépôt Cursor/Origin est **privé**. GitHub ne peut pas le télécharger tout seul.

## Tu viens de connecter GitHub dans Cursor

La connexion dans **Réglages Cursor → GitHub** ne remplit pas le dépôt tout seule : [eliopolidoro73-code/vintflow](https://github.com/eliopolidoro73-code/vintflow) est encore **vide** tant qu’aucun `git push` n’a été fait.

**Fais ça une fois** (terminal intégré Cursor sur **ton PC**, pas le cloud) :

```bash
cd vintflow
git pull origin main
git remote remove github 2>/dev/null
git remote add github https://github.com/eliopolidoro73-code/vintflow.git
git push -u github main
```

Quand GitHub affiche du code sur `main`, Vercel redéploie (si le projet est branché sur ce dépôt). Vérifie ensuite : **https://vintflow-vint4.vercel.app/sitemap.xml** → URLs **`vintflow-vint4.vercel.app`** uniquement.

**Option pour que l’agent cloud pousse à ta place** : dans [Secrets Cursor](https://cursor.com/dashboard?tab=secrets), ajoute un secret perso nommé **`GH_TOKEN`** (PAT GitHub classique, coche **`repo`**), puis écris dans le chat : *« GH_TOKEN ajouté »*. L’agent pourra alors `git push github main` depuis ici.

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