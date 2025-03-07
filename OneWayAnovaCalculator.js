let groupCount = 2;

document.getElementById("add-group").addEventListener("click", () => {
  groupCount++;
  const newGroup = document.createElement("div");
  newGroup.className = "group-input";
  newGroup.innerHTML = `
        <label>Group ${groupCount}:</label>
        <input type="text" class="group-values">
    `;
  document.getElementById("groups-container").appendChild(newGroup);
  updateRemoveButtonState(); // Update button state after adding a group
});

document.getElementById("remove-group").addEventListener("click", () => {
  if (groupCount > 2) {
    const groups = document.getElementById("groups-container");
    groups.removeChild(groups.lastElementChild);
    groupCount--;
    updateRemoveButtonState(); // Update button state after removing a group
  }
});

document.getElementById("calculate").addEventListener("click", calculateANOVA);
document.getElementById("reset").addEventListener("click", () => {
  window.location.reload();
});

function validateInput(values) {
  return values.length >= 2 && values.every((v) => !isNaN(v) && v !== "");
}

function parseValues(input) {
  return input.split(",").map((v) => parseFloat(v.trim()));
}

function calculateMean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateVariance(values, mean) {
  return (
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    (values.length - 1)
  );
}

function calculateStdDev(values, mean) {
  return Math.sqrt(calculateVariance(values, mean));
}

function calculateANOVA() {
  const groups = Array.from(document.getElementsByClassName("group-values"));
  const alpha = parseFloat(document.getElementById("significance").value);

  const data = groups.map((group, index) => {
    const values = parseValues(group.value);
    return {
      name: `Group ${index + 1}`,
      values: values,
      valid: validateInput(values),
    };
  });

  const errorMsg = document.getElementById("error-msg");
  const invalidGroup = data.find((g) => !g.valid);
  if (invalidGroup) {
    errorMsg.textContent = `Error: ${invalidGroup.name} must contain at least 2 valid numeric values`;
    errorMsg.style.display = "block";
    return;
  }

  errorMsg.style.display = "none";
  const result = performAnova(data, alpha);
  displayResults(result);
}

function performAnova(groups, alpha) {
  const groupStats = groups.map((group) => {
    const mean = calculateMean(group.values);
    return {
      ...group,
      n: group.values.length,
      mean: mean,
      stdDev: calculateStdDev(group.values, mean),
      stdErr:
        calculateStdDev(group.values, mean) / Math.sqrt(group.values.length),
    };
  });

  const totalN = groupStats.reduce((sum, g) => sum + g.n, 0);
  const allValues = groupStats.flatMap((g) => g.values);
  const grandMean = calculateMean(allValues);

  const ssBetween = groupStats.reduce((sum, g) => {
    return sum + g.n * Math.pow(g.mean - grandMean, 2);
  }, 0);

  const ssWithin = groupStats.reduce((sum, g) => {
    return sum + g.values.reduce((s, v) => s + Math.pow(v - g.mean, 2), 0);
  }, 0);

  const dfBetween = groups.length - 1;
  const dfWithin = totalN - groups.length;
  const dfTotal = totalN - 1;

  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  const fStat = msBetween / msWithin;

  // Calculate p-value using jStat's F-distribution CDF
  const pValue = 1 - jStat.centralF.cdf(fStat, dfBetween, dfWithin);

  return {
    fStat,
    pValue,
    significanceText:
      pValue <= alpha
        ? "Statistically significant"
        : "Not statistically significant",
    summary: groupStats,
    anovaTable: [
      {
        source: "Between Groups",
        df: dfBetween,
        ss: ssBetween,
        ms: msBetween,
        fStat: fStat,
        pValue: pValue,
      },
      {
        source: "Within Groups",
        df: dfWithin,
        ss: ssWithin,
        ms: msWithin,
      },
      {
        source: "Total",
        df: dfTotal,
        ss: ssBetween + ssWithin,
      },
    ],
  };
}

function displayResults(results) {
  const alpha = parseFloat(document.getElementById("significance").value);
  const resultsSection = document.getElementById("results");
  resultsSection.innerHTML = `
        <div class="stat-card">
            <h2>Results</h2>
            <p>F-statistic value = ${results.fStat.toFixed(4)}</p>
            <p>P-value = ${results.pValue.toFixed(4)}</p>
            <p class="significance">By conventional criteria, this value is considered to be ${results.significanceText.toLowerCase()}.</p>
        </div>

        <div class="stat-card">
            <h3>Data Summary:</h3>
            <table>
                <tr>
                    <th>Groups</th>
                    <th>N</th>
                    <th>Mean</th>
                    <th>Std. Dev.</th>
                    <th>Std. Error</th>
                </tr>
                ${results.summary
                  .map(
                    (g) => `
                    <tr>
                        <td>${g.name}</td>
                        <td>${g.n}</td>
                        <td>${g.mean.toFixed(2)}</td>
                        <td>${g.stdDev.toFixed(4)}</td>
                        <td>${g.stdErr.toFixed(4)}</td>
                    </tr>
                `
                  )
                  .join("")}
            </table>
        </div>

        <div class="stat-card">
            <h3>Anova Summary:</h3>
            <table>
                <tr>
                    <th>Source</th>
                    <th>Degrees of Freedom</th>
                    <th>Sum of Squares</th>
                    <th>Mean Square</th>
                    <th>F-Stat</th>
                    <th>P-value</th>
                </tr>
                ${results.anovaTable
                  .map(
                    (r) => `
                    <tr>
                        <td>${r.source}</td>
                        <td>${r.df}</td>
                        <td>${r.ss.toFixed(2)}</td>
                        <td>${r.ms ? r.ms.toFixed(2) : ""}</td>
                        <td>${r.fStat ? r.fStat.toFixed(4) : ""}</td>
                        <td>${r.pValue ? r.pValue.toFixed(4) : ""}</td>
                    </tr>
                `
                  )
                  .join("")}
            </table>
        </div>
    `;
  resultsSection.classList.add("active");
}

// Function to update the "Remove Group" button state
function updateRemoveButtonState() {
  const removeButton = document.getElementById("remove-group");
  if (groupCount < 3) {
    removeButton.disabled = true;
    removeButton.style.opacity = "0.6"; // Visually indicate it's disabled
    removeButton.style.cursor = "not-allowed"; // Change cursor to indicate non-interactivity
  } else {
    removeButton.disabled = false;
    removeButton.style.opacity = "1";
    removeButton.style.cursor = "pointer";
  }
}

// Initialize button state on page load
document.addEventListener("DOMContentLoaded", updateRemoveButtonState);
