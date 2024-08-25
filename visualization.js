let rootArgument = null;
let currentArgument = null;
let argumentStack = [];

const sundialDiameter = 200; // Diameter of the center circle
const totalDiameter = Math.min(window.innerWidth, window.innerHeight) - 100; // Diameter of the whole sundial
const arcMargin = 5; // Margin between arcs

const fileInput = document.getElementById('fileInput');
const backButton = document.getElementById('backButton');
const errorDiv = document.getElementById('error');
const chartDiv = document.getElementById('chart');
const mainArgumentDiv = document.getElementById('mainArgument');

fileInput.addEventListener('change', handleFileSelect);
backButton.addEventListener('click', goBack);

function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        errorDiv.textContent = '';
        buildGraph(csvData);
    };
    reader.onerror = function(e) {
        errorDiv.textContent = "Error reading file";
    };
    reader.readAsText(file);
}

function buildGraph(csvData) {
    if (!csvData) {
        errorDiv.textContent = "No CSV data available";
        return;
    }

    try {
        const arguments = parseCSV(csvData);
        if (arguments.length === 0) throw new Error("No data found in CSV");
        rootArgument = createHierarchy(arguments);
        currentArgument = rootArgument;
        argumentStack = [];
        createSundialChart(currentArgument);
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = `Error: ${error.message}`;
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j].trim().replace(/^"|"$/g, ''); // Remove quotation marks
        }
        result.push(obj);
    }
    return result;
}

function createHierarchy(arguments) {
    const map = {};

    arguments.forEach(arg => {
        const node = {
            id: arg.id,
            text: arg.text,
            weight: parseFloat(arg.weight),
            sentiment: parseInt(arg.sentiment),
            children: []
        };
        map[arg.id] = node;
    });

    const root = map[arguments[0].id];

    arguments.forEach(arg => {
        if (arg.parent_id && map[arg.parent_id]) {
            map[arg.parent_id].children.push(map[arg.id]);
        }
    });

    return root;
}

function createSundialChart(node) {
    chartDiv.innerHTML = ''; // Clear previous chart
    mainArgumentDiv.textContent = node.text;

    const width = totalDiameter;
    const height = totalDiameter;
    chartDiv.style.width = `${width}px`;
    chartDiv.style.height = `${height}px`;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    chartDiv.appendChild(svg);

    drawArcs(svg, node, centerX, centerY, radius, 0, 2 * Math.PI, 0);
}

function drawArcs(svg, node, centerX, centerY, radius, startAngle, endAngle, depth) {
    const angleSize = endAngle - startAngle;
    const childrenSum = node.children.reduce((sum, child) => sum + child.weight, 0);

    let currentAngle = startAngle;
    node.children.forEach(child => {
        const childAngleSize = (child.weight / childrenSum) * angleSize;
        const childEndAngle = currentAngle + childAngleSize;

        const innerRadius = radius * (depth / (depth + 1)) + arcMargin;
        const outerRadius = radius * ((depth + 1) / (depth + 2)) - arcMargin;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", describeArc(centerX, centerY, innerRadius, outerRadius, currentAngle, childEndAngle));

        const weightFactor = 1 - (child.weight / 10); // Normalize weight to range [0, 1] assuming max weight is 10
        const color = child.sentiment === 1 ? `rgba(0, 128, 0, ${weightFactor})` : `rgba(255, 0, 0, ${weightFactor})`;

        path.setAttribute("fill", color);
        path.setAttribute("stroke", "white");
        path.style.transition = "transform 0.3s ease, fill 0.3s ease";

        path.addEventListener('mouseenter', () => {
            path.setAttribute("fill", "orange");
            const hoverDiv = document.createElement('div');
            hoverDiv.classList.add('hover-info');
            hoverDiv.textContent = `Text: ${child.text} | Weight: ${child.weight}`;
            hoverDiv.style.position = 'absolute';
            hoverDiv.style.background = 'rgba(0, 0, 0, 0.8)';
            hoverDiv.style.color = 'white';
            hoverDiv.style.padding = '5px';
            hoverDiv.style.borderRadius = '5px';
            hoverDiv.style.pointerEvents = 'none';
            hoverDiv.style.left = `${event.pageX}px`;
            hoverDiv.style.top = `${event.pageY}px`;
            document.body.appendChild(hoverDiv);
            path.hoverDiv = hoverDiv;
        });

        path.addEventListener('mouseleave', () => {
            path.setAttribute("fill", color);
            if (path.hoverDiv) {
                document.body.removeChild(path.hoverDiv);
                path.hoverDiv = null;
            }
        });

        path.addEventListener('click', () => {
            path.style.transform = "scale(1.1)";
            setTimeout(() => {
                path.style.transform = "scale(1)";
            }, 300);
            focusOnArgument(child);
        });

        svg.appendChild(path);

        if (child.children && child.children.length > 0) {
            drawArcs(svg, child, centerX, centerY, radius, currentAngle, childEndAngle, depth + 1);
        }

        currentAngle = childEndAngle;
    });
}

function focusOnArgument(argument) {
    argumentStack.push(currentArgument);
    currentArgument = argument;
    createSundialChart(currentArgument);
    backButton.style.display = 'inline-block';
}

function goBack() {
    if (argumentStack.length > 0) {
        currentArgument = argumentStack.pop();
        createSundialChart(currentArgument);
        if (argumentStack.length === 0) {
            backButton.style.display = 'none';
        }
    }
}

function polarToCartesian(centerX, centerY, radius, angleInRadians) {
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, outerRadius, endAngle);
    const end = polarToCartesian(x, y, outerRadius, startAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
    const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);

    return [
        "M", start.x, start.y,
        "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
        "L", innerEnd.x, innerEnd.y,
        "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
        "L", start.x, start.y
    ].join(" ");
}
