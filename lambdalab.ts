import * as ast from './lib/ast';

// Insert text into the DOM at the current caret.
function insertText(text: string) {
  let sel = window.getSelection();
  if (sel.getRangeAt && sel.rangeCount) {
    // Remove any current contents.
    let range = sel.getRangeAt(0);
    range.deleteContents();

    // Add the new text to the DOM.
    let node = document.createTextNode(text);
    range.insertNode(node);

    // Put the selection (caret) after the newly-inserted text.
    let newRange = document.createRange();
    newRange.setStartAfter(node);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

function runCode(code: string, resultList: HTMLElement) {
  let expr = ast.parse(code);
  if (expr) {
    showResult(ast.pretty(expr), resultList);
  }
}

function showResult(res: string, resultList: HTMLElement) {
  // Clear the old contents.
  let range = document.createRange();
  range.selectNodeContents(resultList);
  range.deleteContents();

  // Add a new entry.
  let entry = document.createElement("li");
  entry.textContent = res;
  resultList.appendChild(entry);
}

document.addEventListener("DOMContentLoaded", (event) => {
  let programBox = document.getElementById("program")!;
  let resultList = document.getElementById("result")!;

  programBox.addEventListener("keypress", (event) => {
    // When the user types \, insert a lambda instead.
    if (event.key === "\\") {
      // Don't insert the \ character.
      event.preventDefault();

      // Instead, we'll insert a lambda.
      insertText("λ");

    } else if (event.key === "Enter") {
      event.preventDefault();

      // Parse and execute.
      let code = programBox.textContent!;
      runCode(code, resultList);
    }
  });
});
