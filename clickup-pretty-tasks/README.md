# clickup-pretty-tasks README

ClickUp Pretty Tasks displays tasks description and status right in the code where they are mentioned.

## Features
 - Decorate task links with task status + details
        ![image](https://github.com/everix-io/vscode-extensions/assets/522467/a0b38c41-b002-4e2c-a9b9-975e08f12c13)

 
 - Run commands: 
    - Get ClickUp Task Details by Internal ID
    - Open ClickUp Task Details by Internal ID
    - Get ClickUp Task Details by Custom ID
    - Open ClickUp Task Details by Custom ID

## Configuration

Use command `ClickUp Pretty Tasks: Configure ClickUp` to configure clickup authorisation token and Team ID.

Follow the [official guide](https://clickup.com/api/developer-portal/authentication/) to obtain a Personal token:

### Getting personal token
 - Link to get personal token: https://app.clickup.com/settings/apps (press `Generate` if you don't have it yet)

### Getting Team ID: Option 1
Go to any task of your clickup, look at the URL like `https://app.clickup.com/t/9999999999/XXX-1123`. Here `9999999999` is your Team ID.

### Getting Team ID: Option 2
You can get Team ID with `curl`:
```sh
curl -H "Authorization: YOUR_API_KEY" https://api.clickup.com/api/v2/team
```

Or using PowerShell:
```pwsh
Invoke-RestMethod -Uri "https://api.clickup.com/api/v2/team" -Method Get -Headers @{"Authorization"="YOUR_API_KEY"} | ConvertTo-Json
```

It should give you JSON with your teams for each of which you can see ID (`teams/id`:
```json
{
  "teams": [
    {
      "id": "9999999999",
      "name": "YOUR COMPANY",
      ...
    }
  ]
}
```
