# Portraits des personnages fictifs

Ces personnes n'existent pas. Générez les portraits avec un modèle d'images (Midjourney, Firefly, Higgsfield, etc.), puis déposez chaque fichier dans `apps/api/db/photos/` sous le nom indiqué. `npm run seed` les charge. Sans fichier, l'application affiche les initiales.

**Format :** carré, 1024 × 1024, JPEG ou PNG.

## Bloc commun, à ajouter à la fin de chaque prompt

> Official government ID photo, head and shoulders, facing the camera straight on, eyes open and looking at the lens, plain light grey seamless background, soft even studio lighting without harsh shadows, natural skin texture, no retouching, no makeup beyond everyday, no jewelry except as described, no glasses unless described, neutral relaxed expression with closed mouth, sharp focus, photorealistic, 85mm lens, square 1:1 framing with the top of the shoulders visible. Fictional person, not a real individual, no text, no watermark.

## Citoyens

| Fichier | Prompt (avant le bloc commun) |
|---|---|
| `gisele.jpg` | 87-year-old French-Canadian woman from Trois-Rivières, Québec, short soft white hair neatly combed, kind pale blue eyes, fine deep wrinkles, light skin with age spots, small behind-the-ear hearing aid visible on her right ear, wearing a lavender cardigan over a white blouse |
| `nadia.jpg` | 58-year-old French-Canadian woman from Montréal, shoulder-length brown hair with some grey strands, hazel eyes, light skin, thin rectangular red-framed glasses, wearing a navy blue crew-neck sweater |
| `marc.jpg` | 55-year-old French-Canadian man from Québec City, short salt-and-pepper hair, trimmed grey beard, light skin, brown eyes, wearing a dark green quarter-zip pullover |
| `sarah.jpg` | 32-year-old Québécoise woman, long dark brown hair tied back in a low ponytail, light olive skin, green eyes, light freckles on her nose, wearing a simple heather grey t-shirt |
| `kevin.jpg` | 34-year-old Black Québécois man of Senegalese heritage, short black hair with a clean fade, warm dark brown skin, dark brown eyes, short neat beard, wearing a white collared shirt |
| `leo.jpg` | 15-year-old French-Canadian teenage boy, short wavy light brown hair, light skin, blue eyes, wearing a plain dark blue hoodie |
| `mj.jpg` | 65-year-old French-Canadian woman from Shawinigan, short curly dyed auburn hair, light skin, brown eyes, small pearl stud earrings, wearing a teal blouse |

## Personnel de la santé

Ces photos apparaissent sur la carte d'identité professionnelle et dans l'en-tête de l'espace clinique.

| Fichier | Prompt (avant le bloc commun) |
|---|---|
| `aouellet.jpg` | 44-year-old French-Canadian female emergency physician, dark blonde hair in a practical bun, light skin, grey-blue eyes, wearing navy blue hospital scrubs |
| `proy.jpg` | 61-year-old French-Canadian male family doctor, receding grey hair, light skin, brown eyes, thin wire-rimmed glasses, white coat over a light blue shirt |
| `jlemire.jpg` | 39-year-old French-Canadian female pharmacist, straight black bob haircut, light skin, brown eyes, white pharmacist coat |
| `sdube.jpg` | 36-year-old Québécoise female nurse of Haitian heritage, natural black hair in short twists, dark brown skin, brown eyes, teal hospital scrubs |

## Vérifier avant de déposer une image

- La personne regarde l'objectif, sur un fond uni.
- Aucun texte, aucun filigrane, aucun logo.
- L'âge et les traits correspondent à la description : la photo sert à identifier la personne à l'urgence.
