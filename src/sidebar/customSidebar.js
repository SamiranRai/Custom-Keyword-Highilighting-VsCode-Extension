const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const {
  scanAllFilesContainKeywords,
  setSidebarCallback,
} = require("../features/fileScanner");

// Importing "highlightTimeStamps"
const { highlightTimeStamps } = require("./../features/highlightWord"); // store all keyword timeStamp
const { saveTimestamp } = require("./../db/levelDb");

const {
  loadKeywords,
  updateKeyword,
  addKeyword,
  removeKeyword,
} = require("./../utility/highlight_word_required/keywordManager");

function isFileUnchanged(filePath, prevMtime) {
  const currentMtime = fs.statSync(filePath).mtimeMs;
  return prevMtime === currentMtime;
}

// Helper
function normalizePath(path) {
  return path.replace(/\\/g, "/").toLowerCase();
}

class CustomSidebarProvider {
  constructor(context) {
    this.context = context;
    this.webviewView = null; // Store the webview instance
  }

  resolveWebviewView(webviewView) {
    this.webviewView = webviewView; // Store for later updates

    webviewView.webview.options = { enableScripts: true };

    const htmlPath = path.join(
      this.context.extensionPath,
      "src/sidebar/public/sidebar.html"
    );
    const cssURI = webviewView.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "src/sidebar/public/sidebar.css")
      )
    );
    const jsURI = webviewView.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "src/sidebar/public/sidebar.js")
      )
    );

    const generateColorUri = webviewView.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "src/shared/colorGenerator.js")
      )
    );

    // 🔹 Convert the icons folder path into a webview-safe URI
    const iconsBaseUri = webviewView.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "src/sidebar/public/icons")
      )
    );

    let htmlContent = fs.readFileSync(htmlPath, "utf-8");
    htmlContent = htmlContent
      .replace("{{styleUri}}", cssURI)
      .replace("{{scriptUri}}", jsURI)
      .replace("{{iconsBaseUri}}", iconsBaseUri)
      .replace("{{generateColorUri}}", generateColorUri); // Pass icons URI to HTML;

    webviewView.webview.html = htmlContent;

    // Listen for message from Sidebar (when requesting fresh data)
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "fetchData":
          this.sendSidebarUpdate(await scanAllFilesContainKeywords());
          break;

        case "loadKeywords":
          this.sendSidebarUpdate(await loadKeywords()); // changed
          break;

        case "updateKeyword":
          await updateKeyword(message.keyword, message.newColor);
          this.sendSidebarUpdate(await loadKeywords()); // changed
          break;

        case "tabSwitched":
          await updateKeyword(message.keyword, message.newColor);
          this.sendSidebarUpdate(await scanAllFilesContainKeywords());
          break;

        case "addKeyword":
          await addKeyword(message.keyword, message.color);
          console.log("Keyword Added Successfully");
          this.sendSidebarUpdate(await scanAllFilesContainKeywords());
          break;

        case "removeKeyword":
          await removeKeyword(message.keyword); // Await here
          console.log("Keyword removed Successfully");
          this.sendSidebarUpdate(await scanAllFilesContainKeywords()); // changed from removeKeyword()
          break;

        case "toggleMark":
          try {
            const uri = vscode.Uri.file(message.fullPath);

            let updatedLineText = "";
            const timestamp = new Date();
            const options = { day: "2-digit", month: "short", year: "numeric" };
            const formattedTimestamp = timestamp.toLocaleDateString(
              "en-GB",
              options
            );
            const milliseconds = timestamp.getTime();

            let isDeleteAction = false;

            // Determine action
            if (message.action === "done") {
              updatedLineText = `// DONE: "${message.keyword}" - ${message.comment} [${formattedTimestamp} | ${milliseconds}]`;
            } else if (message.action === "undo") {
              updatedLineText = `// ${message.keyword}: ${message.comment}`;
            } else if (message.action === "disable") {
              updatedLineText = `// ${message.keyword} : ${message.comment}`;
            } else if (message.action === "delete") {
              isDeleteAction = true;
            } else {
              console.warn("❌ Unknown toggleMark action:", message.action);
              break;
            }

            let document;
            try {
              document = await vscode.workspace.openTextDocument(uri);
            } catch (err) {
              console.error(
                "🚨 Failed to open document, falling back to file system.",
                err
              );
            }

            if (document) {
              // File is open or can be opened normally
              const editor = await vscode.window.showTextDocument(document, {
                preview: false,
                preserveFocus: true,
              });

              const lineIndex = message.line - 1; // Adjusting for 1-based to 0-based line number
              if (lineIndex < 0 || lineIndex >= document.lineCount) {
                console.warn("❌ Invalid line number:", message.line);
                break;
              }

              const line = document.lineAt(lineIndex);

              await editor.edit((editBuilder) => {
                if (isDeleteAction) {
                  editBuilder.delete(line.rangeIncludingLineBreak);
                } else {
                  editBuilder.replace(line.range, updatedLineText);
                }
              });
            } else {
              // fallback : file is closed and cannot open in editor
              const fileBuffer = await vscode.workspace.fs.readFile(uri);
              const fileContent = Buffer.from(fileBuffer).toString("utf-8");
              const lines = fileContent.split(/\r?\n/); // handle both LF and CRLF endings
              const lineIndex = message.line - 1;
              if (lineIndex < 0 || lineIndex >= lines.length) {
                console.warn(
                  "❌ Invalid line number in fallback mode:",
                  message.line
                );
                break;
              }

              const originalLineEnding = fileContent.includes("\r\n")
                ? "\r\n"
                : "\n";

              if (isDeleteAction) {
                lines.splice(lineIndex, 1);
              } else {
                lines[lineIndex] = updatedLineText;
              }

              const updatedContent = lines.join(originalLineEnding);
              const updatedBuffer = Buffer.from(updatedContent, "utf-8");
              await vscode.workspace.fs.writeFile(uri, updatedBuffer);
            }

            // Update the sidebar UI
            try {
              const updatedSidebarData = await scanAllFilesContainKeywords();
              this.sendSidebarUpdate(updatedSidebarData);
            } catch (sidebarError) {
              console.error("🚨 Sidebar update error:", sidebarError);
            }
          } catch (err) {
            console.error("🚨 toggleMark general error:", err.stack || err);
          }
          break;

        case "deleteAll":
          try {
            const confirmation = await vscode.window.showWarningMessage(
              "This will delete all DONE items from all your files. Are you sure you want to continue?",
              { modal: true },
              "Yes",
              "Cancel"
            );

            if (confirmation !== "Yes") {
              break;
            }

            // SCAN ALL KEYWORDS
            const allKeywordItems = await scanAllFilesContainKeywords();

            // FILTER ONLY DONE KEYWORD
            const doneItems = allKeywordItems.filter(
              (item) =>
                item.keyword === "DONE" &&
                item.fullPath &&
                typeof item.line === "number"
            );

            // CHECKING FOR DONE KEYWORD
            if (doneItems.length === 0) {
              vscode.window.showInformationMessage(
                "No DONE items found to delete."
              );
              break;
            }

            // Group items by file
            const groupedByFile = {};
            for (const item of doneItems) {
              if (!groupedByFile[item.fullPath])
                groupedByFile[item.fullPath] = [];
              groupedByFile[item.fullPath].push(item.line - 1); // Adjust to 0-based index
            }

            for (const [fullPath, lineIndices] of Object.entries(
              groupedByFile
            )) {
              try {
                const uri = vscode.Uri.file(fullPath);
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document, {
                  preview: false,
                  preserveFocus: true,
                });

                const sortedLines = lineIndices.sort((a, b) => b - a); // Delete bottom-up

                await editor.edit((editBuilder) => {
                  for (const lineIndex of sortedLines) {
                    if (lineIndex >= 0 && lineIndex < document.lineCount) {
                      const line = document.lineAt(lineIndex);
                      editBuilder.delete(line.rangeIncludingLineBreak);
                    }
                  }
                });
              } catch (err) {
                console.error(`❌ Failed to process file: ${fullPath}`, err);
              }
            }

            vscode.window.showInformationMessage(
              `✅ Successfully deleted ${doneItems.length} DONE items across all files.`
            );

            // Refresh the sidebar UI
            try {
              const updatedSidebarData = await scanAllFilesContainKeywords();
              this.sendSidebarUpdate(updatedSidebarData); // Replace with your actual webview update method
            } catch (sidebarErr) {
              console.error("🚨 Sidebar update error:", sidebarErr);
            }
          } catch (err) {
            console.error("🚨 deleteAll general error:", err.stack || err);
          }
          break;

        case "vscode.open":
          const { fullPath, line } = message;
          // Open the file and jump to the exact line
          vscode.window.showTextDocument(vscode.Uri.file(fullPath), {
            selection: new vscode.Range(
              new vscode.Position(line - 1, 0),
              new vscode.Position(line - 1, 0)
            ),
          });
          break;

        case "requestUpdateData":
          try {
            const updatedSidebarData = await scanAllFilesContainKeywords();
            this.sendSidebarUpdate(updatedSidebarData);
          } catch (err) {
            console.error("❌ Failed to send updateData:", err);
          }
          break;

        default:
          console.warn("⚠️ Unknown command received:", message.command);
      }
    });

    setSidebarCallback((updateData) => {
      this.sendSidebarUpdate(updateData);
    });
  }

  sendSidebarUpdate(data) {
    if (this.webviewView && this.webviewView.webview) {
      this.webviewView.webview.postMessage({ command: "updateData", data });
    } else {
      console.warn("⚠️ Sidebar webview is unavailable. Could not send update.");
    }
  }
}

module.exports = CustomSidebarProvider;
