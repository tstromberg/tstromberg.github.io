import json
import os

with open('import/thomrstrom-blog-posts-and-info-202507061949.json') as f:
    data = json.load(f)

for collection in data['collections']:
    for post in collection['posts']:
        with open(os.path.join('posts', post['slug'] + '.md'), 'w') as out:
            out.write('---\n')
            out.write('title: "' + post['title'] + '"\n')
            out.write('date: ' + post['created'].split('T')[0] + '\n')
            out.write('---\n')
            out.write(post['body'])
