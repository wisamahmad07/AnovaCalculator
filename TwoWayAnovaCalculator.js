// Grid management functions
function addRow() {
  const tbody = document.querySelector("#inputGrid tbody");
  const cols = tbody.rows[0] ? tbody.rows[0].cells.length : 2;
  const row = document.createElement("tr");

  for (let i = 0; i < cols; i++) {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    cell.appendChild(input);
    row.appendChild(cell);
  }

  tbody.appendChild(row);
}

function deleteRow() {
  const tbody = document.querySelector("#inputGrid tbody");
  if (tbody.rows.length > 2) {
    // Enforce minimum 2 rows
    tbody.deleteRow(tbody.rows.length - 1);
  }
}

function addColumn() {
  const rows = document.querySelectorAll("#inputGrid tbody tr");
  rows.forEach((row) => {
    const cell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    cell.appendChild(input);
    row.appendChild(cell);
  });
}

function deleteColumn() {
  const rows = document.querySelectorAll("#inputGrid tbody tr");
  if (rows[0].cells.length > 2) {
    // Enforce minimum 2 columns
    rows.forEach((row) => {
      row.deleteCell(row.cells.length - 1);
    });
  }
}

// ANOVA calculation function
function calculateANOVA() {
  try {
    // Reset input styling
    document.querySelectorAll("#inputGrid input").forEach((input) => {
      input.classList.remove("error");
    });

    // Parse input data
    const data = [];
    let nPerCell = null;
    let balanced = true;

    const rows = document.querySelectorAll("#inputGrid tbody tr");
    rows.forEach((row) => {
      const rowData = [];
      Array.from(row.cells).forEach((cell) => {
        const input = cell.querySelector("input");
        const values = input.value
          .split(",")
          .map((v) => parseFloat(v.trim()))
          .filter((v) => !isNaN(v));

        if (values.length === 0) {
          input.classList.add("error");
          throw new Error("Empty or invalid cell found");
        }

        if (nPerCell === null) nPerCell = values.length;
        else if (values.length !== nPerCell) balanced = false;

        rowData.push(values);
      });
      data.push(rowData);
    });

    if (!balanced)
      throw new Error(
        "Design is not balanced (all cells must have the same number of observations)"
      );

    // Calculate ANOVA components
    const a = data.length;
    const b = data[0].length;
    const n = nPerCell;
    const totalObs = a * b * n;

    // Calculate means
    let grandSum = 0;
    const cellMeans = [];
    const rowSums = new Array(a).fill(0);
    const colSums = new Array(b).fill(0);

    for (let i = 0; i < a; i++) {
      cellMeans[i] = [];
      for (let j = 0; j < b; j++) {
        const sum = data[i][j].reduce((a, b) => a + b, 0);
        const mean = sum / n;
        cellMeans[i][j] = mean;

        grandSum += sum;
        rowSums[i] += sum;
        colSums[j] += sum;
      }
    }

    const grandMean = grandSum / totalObs;
    const rowMeans = rowSums.map((s) => s / (b * n));
    const colMeans = colSums.map((s) => s / (a * n));

    // Calculate Sum of Squares
    let SSA = 0,
      SSB = 0,
      SSAB = 0,
      SSE = 0;

    // SSA
    SSA =
      b *
      n *
      rowMeans.reduce((acc, mean) => acc + Math.pow(mean - grandMean, 2), 0);

    // SSB
    SSB =
      a *
      n *
      colMeans.reduce((acc, mean) => acc + Math.pow(mean - grandMean, 2), 0);

    // SSAB
    for (let i = 0; i < a; i++) {
      for (let j = 0; j < b; j++) {
        const interaction =
          cellMeans[i][j] - rowMeans[i] - colMeans[j] + grandMean;
        SSAB += n * Math.pow(interaction, 2);
      }
    }

    // SSE
    for (let i = 0; i < a; i++) {
      for (let j = 0; j < b; j++) {
        SSE += data[i][j].reduce(
          (acc, val) => acc + Math.pow(val - cellMeans[i][j], 2),
          0
        );
      }
    }

    // Degrees of Freedom
    const dfA = a - 1;
    const dfB = b - 1;
    const dfAB = (a - 1) * (b - 1);
    const dfError = a * b * (n - 1);
    const dfTotal = totalObs - 1;

    // Mean Squares
    const MSA = SSA / dfA;
    const MSB = SSB / dfB;
    const MSAB = SSAB / dfAB;
    const MSE = SSE / dfError;

    // F-Statistics
    const F_A = MSA / MSE;
    const F_B = MSB / MSE;
    const F_AB = MSAB / MSE;

    // Update results table
    const resultsBody = document.getElementById("resultsBody");
    resultsBody.innerHTML = `
                  <tr>
                      <td>A</td>
                      <td>${dfA}</td>
                      <td>${SSA.toFixed(2)}</td>
                      <td>${MSA.toFixed(2)}</td>
                      <td>${F_A.toFixed(4)}</td>
                      <td>-</td>
                  </tr>
                  <tr>
                      <td>B</td>
                      <td>${dfB}</td>
                      <td>${SSB.toFixed(2)}</td>
                      <td>${MSB.toFixed(2)}</td>
                      <td>${F_B.toFixed(4)}</td>
                      <td>-</td>
                  </tr>
                  <tr>
                      <td>AB</td>
                      <td>${dfAB}</td>
                      <td>${SSAB.toFixed(2)}</td>
                      <td>${MSAB.toFixed(2)}</td>
                      <td>${F_AB.toFixed(4)}</td>
                      <td>-</td>
                  </tr>
                  <tr>
                      <td>Error</td>
                      <td>${dfError}</td>
                      <td>${SSE.toFixed(2)}</td>
                      <td>${MSE.toFixed(2)}</td>
                      <td></td>
                      <td></td>
                  </tr>
                  <tr>
                      <td>Total</td>
                      <td>${dfTotal}</td>
                      <td>${(SSA + SSB + SSAB + SSE).toFixed(2)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                  </tr>
              `;

    // Show results with animation
    const resultsSection = document.querySelector(".results-section");
    resultsSection.classList.add("show");
  } catch (error) {
    alert(error.message);
  }
}

// Initialize with 2 rows and 2 columns and pre-populate with sample data
window.onload = () => {
  // Add 2 rows
  addRow();
  addRow();

  // Pre-populate with sample data
  const inputs = document.querySelectorAll("#inputGrid input");
  inputs[0].placeholder = "4,6,8";
  inputs[1].placeholder = "4,8,9";
  inputs[2].placeholder = "6,6,9";
  inputs[3].placeholder = "7,10,13";
};
