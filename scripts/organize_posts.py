import os
import re

for filename in os.listdir('posts'):
    if not filename.endswith('.md'):
        continue

    with open(os.path.join('posts', filename), 'r') as f:
        content = f.read()

    match = re.search(r'^date: (.*)', content, re.MULTILINE)
    if not match:
        print(f'Could not find date in {filename}')
        continue

    date_str = match.group(1).replace('"', '')
    year = date_str.split('-')[0]
    slug = os.path.splitext(filename)[0]

    new_dir = os.path.join('posts', year, slug)
    os.makedirs(new_dir, exist_ok=True)

    with open(os.path.join(new_dir, 'index.md'), 'w') as f:
        f.write(content)

    os.remove(os.path.join('posts', filename))