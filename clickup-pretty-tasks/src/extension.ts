import * as vscode from "vscode";

const apiKeySettingsKey = "clickup-pretty-tasks.clickup-apikey";
const teamIdSettingsKey = "clickup-pretty-tasks.clickup-teamid";
// matching two types of links:
//   https://app.clickup.com/t/1231231231/ABC-4998  <- with custom task id
//   https://app.clickup.com/t/1234567ab  <- without

// expression to just match with custom taks id
// const clickupLinkRegex =
//   /https:\/\/app\.clickup\.com\/t\/([0-9]+)\/([A-Z0-9-]+)/g;

// [expression to match both types of links]
const clickupLinkRegex =
  /https:\/\/app\.clickup\.com\/t\/(?:([0-9]+)\/)?([a-z0-9-]+)/gi;

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "clickup-pretty-tasks" is now active!'
  );

  // Commands part:
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.configureClikupPrettyTasks",
      configureExtension
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.getClickUpTask", getClickUpTask)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openClickUpTask", openClickupTask)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.getClickUpTaskByInternalId", getClickUpTaskByInternalId)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openClickUpTaskByInternalId", openClickupTaskByInternalId)
  );

  // Decoration part:

  let timeout: NodeJS.Timer | undefined = undefined;

  // create a decorator type that we use to decorate small numbers
  const taskDecorationType = vscode.window.createTextEditorDecorationType({
    borderWidth: "1px",
    borderStyle: "solid",
    overviewRulerColor: "blue",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
      // this color will be used in light color themes
      borderColor: "darkblue",
    },
    dark: {
      // this color will be used in dark color themes
      borderColor: "lightblue",
    },
  });

  let activeEditor = vscode.window.activeTextEditor;

  async function updateDecorations() {
    if (!activeEditor) {
      return;
    }
    const text = activeEditor.document.getText();
    const taskDecorations: vscode.DecorationOptions[] = [];
    let taskMatch;

    // [sno] next improvemnt to add 'loading' decoration temporarily (but we need to track them to remove)
    // let loadingDecorationsMap = new Map<string, vscode.DecorationOptions>();

    // while ((taskMatch = clickupLinkRegex.exec(text))) {
    //   const teamId = taskMatch[1];
    //   const taskId = taskMatch[2];
    //   const startPos = activeEditor.document.positionAt(taskMatch.index);
    //   const endPos = activeEditor.document.positionAt(
    //     taskMatch.index + taskMatch[0].length
    //   );
    //   const loadingDecoration: vscode.DecorationOptions = {
    //     range: new vscode.Range(startPos, endPos),
    //     // hoverMessage: `(loading task details for '${taskId}' )`,
    //     renderOptions: {
    //       after: {
    //         contentText: `(loading task details for '${taskId}...' )`,
    //         color: "gray",
    //       },
    //     },
    //   };
    //   taskDecorations.push(loadingDecoration);
    //   loadingDecorationsMap.set(taskId, loadingDecoration);
    // }
    // activeEditor.setDecorations(taskDecorationType, taskDecorations);

    while ((taskMatch = clickupLinkRegex.exec(text))) {
      const teamId = taskMatch[1];
      const taskId = taskMatch[2];
      const startPos = activeEditor.document.positionAt(taskMatch.index);
      const endPos = activeEditor.document.positionAt(
        taskMatch.index + taskMatch[0].length
      );

      let taskDetails = null;
      try {
        let taskType: TaskIdType;
        if (teamId) {
          taskType = TaskIdType.InternalId;
        } else {
          taskType = TaskIdType.customTaskID;
        }

        taskDetails = await getTaskDetails(taskId, teamId, taskType);
        if (taskDetails) {
          const id = taskDetails.id;
          if (!id) {
            const notFoundDecoration: vscode.DecorationOptions = {
              range: new vscode.Range(startPos, endPos),
              renderOptions: {
                after: {
                  contentText: `Task not found'`,
                  color: "grey",
                },
              },
            };
            taskDecorations.push(notFoundDecoration);
          } else {
            const color = taskDetails.status?.color || "gray";
            const status = taskDetails.status?.status || "";
            const title = taskDetails.name;
            //   const id = taskDetails.id;
            const custom_id = taskDetails.custom_id;
            const assigneeUsernames = taskDetails.assignees
              ? taskDetails.assignees.map((x: any) => x.username)
              : [];
            const assigneeString = assigneeUsernames.join(", ");
            const description = taskDetails.description;

            // [sno] parial text
            // "id": "12345da92",
            // "custom_id": "ABC-5432
            // "custom_item_id": 0,
            // "name": "Some task name",
            // "text_content": "",
            // "description": "",
            // "status": {
            //     "id": "...",
            //     "status": "to do",
            //     "color": "#87909e",
            //     "orderindex": 0,
            //     "type": "open"
            //   },
            // "assignees": [
            //     {
            //       "id": 81602765,
            //       "username": "John Doe",
            //       "color": "#536cfe",
            //       "initials": "AL",
            //       "email": "john doe@everix.io",
            //       "profilePicture": null
            //     }
            //   ],
            //   "watchers": [
            //     {
            //       "id": 81602765,
            //       "username": "John Doe",
            //       "color": "#536cfe",
            //       "initials": "AL",
            //       "email": "john doe@everix.io",
            //       "profilePicture": null
            //     }
            //   ],

            const descriptionText = ` ([${status}] ${title} (${custom_id}))`;
            const descriptionLongText = ` [${status}] ${title} \n (${custom_id})\n ${assigneeString} \n ${description}`;

            const taskDetailsDecorations: vscode.DecorationOptions = {
              range: new vscode.Range(startPos, endPos),
              hoverMessage: descriptionLongText, // You can have a hover message with the description
              renderOptions: {
                after: {
                  contentText: descriptionText,
                  color: color,
                },
              },
            };

            taskDecorations.push(taskDetailsDecorations);
          }
        }
      } catch (e: any) {
        const errorDecoration: vscode.DecorationOptions = {
          range: new vscode.Range(startPos, endPos),
          renderOptions: {
            after: {
              contentText: `Failed to get fecth task info: '${taskId}. Error: ${e.message}'`,
              color: "red",
            },
          },
        };
        taskDecorations.push(errorDecoration);
      }
    }
    activeEditor.setDecorations(taskDecorationType, taskDecorations);
  }

  async function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout as any);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 500);
    } else {
      await updateDecorations();
    }
  }

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true);
      }
    },
    null,
    context.subscriptions
  );
}

async function setTeamId() {
  await setProperty("Clickup Team Id", teamIdSettingsKey);
}

async function configureExtension() {
  await setApiKey();
  await getApiKey(); // inside testing that is not null
  await setTeamId();
  await getTeamId(); // inside testing that is not null
}
async function setApiKey() {
  await setProperty("Clickup Api Key", apiKeySettingsKey);
}

async function setProperty(propertyTitle: string, PropertyKey: string) {
  // Prompt the user to enter the API Key
  const propertyValue = await vscode.window.showInputBox({
    prompt: `Enter ${propertyTitle}`,
    ignoreFocusOut: true,
  });

  await vscode.workspace
    .getConfiguration()
    .update(PropertyKey, propertyValue, vscode.ConfigurationTarget.Global);

  // Get the API Key from the global state to confirm it was stored
  const retrievedPropertyValue = vscode.workspace
    .getConfiguration()
    .get(PropertyKey);
  vscode.window.showInformationMessage(
    `${propertyTitle} set to: ${retrievedPropertyValue}`
  );
}

async function openClickupTask() {
  // [sno] now only custom task id
  const taskId = await vscode.window.showInputBox({
    prompt: "Enter Task ID",
    ignoreFocusOut: true,
  });
  const teamId = await getTeamId();
  const uri = vscode.Uri.parse(`https://app.clickup.com/t/${teamId}/${taskId}`);
  await vscode.env.openExternal(uri);
}

async function openClickupTaskByInternalId() {
  // [sno] now only custom task id
  const taskId = await vscode.window.showInputBox({
    prompt: "Enter Task ID",
    ignoreFocusOut: true,
  });
  const uri = vscode.Uri.parse(`https://app.clickup.com/t/${taskId}`);
  await vscode.env.openExternal(uri);
}

async function getClickUpTask() {
  const taskId = await vscode.window.showInputBox({
    prompt: "Enter Task ID",
    ignoreFocusOut: true,
  });
  const taskDetails = await getTaskDetails(taskId as string);
  //   const json = `${JSON.stringify(taskDetails)}`
  vscode.window.showInformationMessage(
    `[${taskDetails.status.status}] ${taskDetails.name} `
  );
}

async function getClickUpTaskByInternalId() {
  const taskId = await vscode.window.showInputBox({
    prompt: "Enter Task ID",
    ignoreFocusOut: true,
  });
  const taskDetails = await getTaskDetails(taskId as string, "", TaskIdType.InternalId);
  //   const json = `${JSON.stringify(taskDetails)}`
  vscode.window.showInformationMessage(
    `[${taskDetails.status.status}] ${taskDetails.name} `
  );
}

async function getApiKey(): Promise<any> {
  let apiKey = await vscode.workspace.getConfiguration().get(apiKeySettingsKey);
  if (!apiKey) {
    await setApiKey();
    apiKey = await getTeamId();
  }
  if (!apiKey) {
    throw new Error("No API Key set");
  }
  return apiKey;
}
async function getTeamId(): Promise<any> {
  let teamID = await vscode.workspace.getConfiguration().get(teamIdSettingsKey);
  if (!teamID) {
    await setTeamId();
    teamID = await getTeamId();
  }
  if (!teamID) {
    throw new Error("No Team Id set");
  }
  return teamID;
}

enum TaskIdType {
  customTaskID = "customTaskID",
  InternalId = "InternalId",
}

async function getTaskDetails(
  taskId: string,
  teamId: string = "",
  taskIdType: TaskIdType = TaskIdType.customTaskID
): Promise<any> {
  const apiKey: string = await getApiKey();

  // [sno] code from here https://clickup.com/api/clickupreference/operation/GetTask/
  let query: string;
  switch (taskIdType) {
    case TaskIdType.customTaskID:
      if (!teamId || teamId === "") {
        teamId = await getTeamId();
      }
      query = new URLSearchParams({
        custom_task_ids: "false",
        include_subtasks: "true",
        include_markdown_description: "true",
      }).toString();
      break;
    case TaskIdType.InternalId:
      query = new URLSearchParams({
        custom_task_ids: "true",
        team_id: teamId,
        include_subtasks: "true",
        include_markdown_description: "true",
      }).toString();
      break;
      break;
    default:
      throw new Error(`Invalid TaskIdType: ${taskIdType}`);
  }
  const response = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
    {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    }
  );

  const data = await response.text();
  const pasrsedData = JSON.parse(data);
  return pasrsedData;
}

// This method is called when your extension is deactivated
export function deactivate() {}
