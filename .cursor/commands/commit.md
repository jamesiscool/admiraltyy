Generate a commit message
- run `bun fix` without the sandbox to fix and lint and format all files
- If there are no staged changes, create the message based off all unstaged changes 
- Use the conventional commit naming standard
- If there is only one change and the change is relatively simple, do not have a message body 
- Make the message body extremely concise. Sacrifice grammar for the sake of concision. Do not add "for" or other change explanation

Show me the message in a multi-line box. Ask me if it's OK and if I say "y" or "yes,". If there is staged changes commit and push them, if there isn't add all untracked files and stage all changes and commit and push that