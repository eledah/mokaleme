let rootArgument = null;
let currentArgument = null;
let argumentStack = [];
let currentLocale = 'en';
let localeData = {};


const sundialDiameter = 200; // Diameter of the center circle
const totalDiameter = Math.min(window.innerWidth, window.innerHeight) - 100; // Diameter of the whole sundial
const arcMargin = 5; // Margin between arcs

const fileInput = document.getElementById('fileInput');
const backButton = document.getElementById('backButton');
const errorDiv = document.getElementById('error');
const chartDiv = document.getElementById('chart');
const mainArgumentDiv = document.getElementById('mainArgument');
const leftMenuDiv = document.createElement('div');
const rightMenuDiv = document.createElement('div');

leftMenuDiv.id = 'leftMenu';
rightMenuDiv.id = 'rightMenu';
document.body.insertBefore(leftMenuDiv, chartDiv);
document.body.insertBefore(rightMenuDiv, chartDiv.nextSibling);

// Style the menus
const menuStyle = `
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    width: 250px;
    max-height: 80vh;
    overflow-y: auto;
    background-color: #f8f9fa;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 20px;
    z-index: 1000;
`;

leftMenuDiv.style.cssText = menuStyle + 'left: 20px;';
rightMenuDiv.style.cssText = menuStyle + 'right: 20px;';

// Style for menu items
const menuItemStyle = `
    padding: 10px;
    margin: 5px 0;
    background-color: #ffffff;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
`;

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
    console.log(csvData);
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
        updateMenus(currentArgument);
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = `Error: ${error.message}`;
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(header => header.trim());
    const result = [];
    
    // Always include the second line (main argument)
    const mainArgument = lines[1].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (mainArgument && mainArgument.length === headers.length) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = mainArgument[j].replace(/^"|"$/g, '').trim();
        }
        result.push(obj);
    } else {
        console.error("Main argument (second line) is invalid or missing");
        return result;
    }

    for (let i = 2; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (currentLine && currentLine.length === headers.length) {
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentLine[j].replace(/^"|"$/g, '').trim();
            }
            result.push(obj);
        } else {
            console.warn(`Skipping line ${i + 1}: incorrect number of fields`);
        }
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
    const radius = (Math.min(width, height) / 2) - 10;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    chartDiv.appendChild(svg);

    // Add the center circle
    const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centerCircle.setAttribute("cx", centerX);
    centerCircle.setAttribute("cy", centerY);
    centerCircle.setAttribute("r", sundialDiameter / 2);
    centerCircle.setAttribute("fill", "white");
    centerCircle.setAttribute("stroke", "white");
    centerCircle.setAttribute("stroke-width", "5px");
    
    // Append the center circle after drawing the arcs
    drawArcs(svg, node, centerX, centerY, radius, 0, 2 * Math.PI, 0);
    svg.appendChild(centerCircle);

    // Add click event listener to svg to remove hover tooltip
    svg.addEventListener('click', removeAllHoverTooltips);
}

function drawArcs(svg, node, centerX, centerY, radius, startAngle, endAngle, depth) {
    const angleSize = endAngle - startAngle;
    const childrenSum = node.children.reduce((sum, child) => sum + child.weight, 0);

    // Sort children by sentiment
    node.children.sort((a, b) => a.sentiment - b.sentiment);

    // Log parent and children IDs to the deepest level
    // function logChildrenRecursively(node, depth = 0) {
    //     const indent = '  '.repeat(depth);
    //     console.log(`${indent}${node.id} -> ${node.children.map(child => child.id).join(',')}`);
    //     node.children.forEach(child => logChildrenRecursively(child, depth + 1));
    // }
    // logChildrenRecursively(node);

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
        path.style.transition = "transform 0.3s ease, fill 0.3s ease, opacity 0.5s ease";
        path.setAttribute("data-id", child.id);

        let hoverDiv;
        path.addEventListener('mouseenter', (event) => {
            path.setAttribute("fill", "orange");
            hoverDiv = document.createElement('div');
            hoverDiv.classList.add('hover-info');
            hoverDiv.textContent = `${child.text} | ${localeData.weight}: ${child.weight}`;
            hoverDiv.style.position = 'absolute';
            hoverDiv.style.background = 'rgba(0, 0, 0, 0.8)';
            hoverDiv.style.color = 'white';
            hoverDiv.style.padding = '10px';
            hoverDiv.style.borderRadius = '5px';
            hoverDiv.style.pointerEvents = 'none';
            hoverDiv.style.left = `${event.pageX}px`;
            hoverDiv.style.top = `${event.pageY}px`;
            hoverDiv.style.opacity = '0';
            hoverDiv.style.transition = 'opacity 0.3s ease';
            hoverDiv.style.width = '200px'; // Fixed width
            hoverDiv.style.overflowWrap = 'break-word'; // Ensure long words don't overflow
            hoverDiv.style.textAlign = currentLocale === 'fa' ? 'right' : 'left'; // Align text based on language
            document.body.appendChild(hoverDiv);
            setTimeout(() => {
                hoverDiv.style.opacity = '1';
            }, 10);

            // Highlight corresponding menu item
            const menuItem = document.querySelector(`.menu-item[data-id="${child.id}"]`);
            if (menuItem) {
                menuItem.style.backgroundColor = '#e9ecef';
            }
        });
        
        path.addEventListener('mouseleave', () => {
            path.setAttribute("fill", color);
            if (hoverDiv) {
                hoverDiv.style.opacity = '0';
                setTimeout(() => {
                    if (hoverDiv.parentNode) {
                        hoverDiv.parentNode.removeChild(hoverDiv);
                    }
                }, 300);
            }

            // Remove highlight from menu item
            const menuItem = document.querySelector(`.menu-item[data-id="${child.id}"]`);
            if (menuItem) {
                menuItem.style.backgroundColor = '';
            }
        });

        path.addEventListener('click', () => {
            if (child.children && child.children.length > 0) {
                animateArcClick(svg, path, child);
            }
        });

        svg.appendChild(path);

        if (child.children && child.children.length > 0) {
            drawArcs(svg, child, centerX, centerY, radius, currentAngle, childEndAngle, depth + 1);
        }

        currentAngle = childEndAngle;
    });
}

function animateArcClick(svg, clickedPath, clickedChild) {
    const allPaths = svg.querySelectorAll('path');
    
    // Step 1: Hide all arcs
    allPaths.forEach(path => {
        path.style.opacity = '0';
    });
    
    // Step 2: After a delay, create and fade in the new arcs for the clicked child
    setTimeout(() => {
        if (clickedChild.children.length === 1) {
            createFullCircleArc(clickedChild.children[0]);
        } else {
            createSundialChart(clickedChild);
        }
        const newPaths = svg.querySelectorAll('path');
        newPaths.forEach(path => {
            path.style.opacity = '0';
            setTimeout(() => {
                path.style.opacity = '1';
            }, 10);
        });
    }, 300);
    
    // Update the current argument and menus
    argumentStack.push(currentArgument);
    currentArgument = clickedChild;
    updateMenus(currentArgument);
    backButton.style.display = 'inline-block';
}

function createFullCircleArc(child) {
    chartDiv.innerHTML = ''; // Clear previous chart
    mainArgumentDiv.textContent = child.text;

    const width = totalDiameter;
    const height = totalDiameter;
    chartDiv.style.width = `${width}px`;
    chartDiv.style.height = `${height}px`;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (Math.min(width, height) / 4) - 10;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    chartDiv.appendChild(svg);

    // Create a full circle instead of an arc
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", centerX);
    circle.setAttribute("cy", centerY);
    circle.setAttribute("r", radius);

    const weightFactor = 1 - (child.weight / 10);
    const color = child.sentiment === 1 ? `rgba(0, 128, 0, ${weightFactor})` : `rgba(255, 0, 0, ${weightFactor})`;

    circle.setAttribute("fill", color);
    circle.setAttribute("stroke", "white");
    circle.style.transition = "transform 0.3s ease, fill 0.3s ease, opacity 0.5s ease";
    circle.setAttribute("data-id", child.id);

    // Append the circle to the SVG
    svg.appendChild(circle);

    // Add the center circle
    const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centerCircle.setAttribute("cx", centerX);
    centerCircle.setAttribute("cy", centerY);
    centerCircle.setAttribute("r", sundialDiameter / 2);
    centerCircle.setAttribute("fill", "white");
    centerCircle.setAttribute("stroke", "white");
    centerCircle.setAttribute("stroke-width", "5px");
    
    // Append the center circle after the full circle
    svg.appendChild(centerCircle);

    // Add click event listener to svg to remove hover tooltip
    svg.addEventListener('click', removeAllHoverTooltips);
}

function removeAllHoverTooltips() {
    const hoverDivs = document.querySelectorAll('.hover-info');
    hoverDivs.forEach(div => {
        div.style.opacity = '0';
        setTimeout(() => {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        }, 300);
    });
}

function focusOnArgument(argument) {
    argumentStack.push(currentArgument);
    currentArgument = argument;
    if (argument.children.length === 1) {
        createFullCircleArc(argument.children[0]);
    } else {
        createSundialChart(currentArgument);
    }
    updateMenus(currentArgument);
    backButton.style.display = 'inline-block';
}

function goBack() {
    if (argumentStack.length > 0) {
        const svg = chartDiv.querySelector('svg');
        const allPaths = svg.querySelectorAll('path');
        
        // Step 1: Hide all current arcs
        allPaths.forEach(path => {
            path.style.opacity = '0';
        });
        
        // Step 2: After a delay, create and fade in the arcs for the previous level
        setTimeout(() => {
            currentArgument = argumentStack.pop();
            createSundialChart(currentArgument);
            updateMenus(currentArgument);
            
            const newPaths = svg.querySelectorAll('path');
            newPaths.forEach(path => {
                path.style.opacity = '0';
                setTimeout(() => {
                    path.style.opacity = '1';
                }, 10);
            });
            
            if (argumentStack.length === 0) {
                backButton.style.display = 'none';
            }
        }, 300);
    }
}

function updateMenus(node) {
    leftMenuDiv.innerHTML = `<h3>${localeData.supportingArguments}</h3>`;
    rightMenuDiv.innerHTML = `<h3>${localeData.opposingArguments}</h3>`;

    let isEven = true;

    node.children.forEach(child => {
        const menuItem = document.createElement('div');
        menuItem.classList.add('menu-item');
        menuItem.setAttribute('data-id', child.id);
        menuItem.textContent = `${child.text} | ${localeData.weight}: ${child.weight}`;
        menuItem.style.cssText = menuItemStyle;
        
        // Add alternating background colors
        menuItem.style.backgroundColor = isEven ? '#f0f0f0' : '#e0e0e0';
        isEven = !isEven;

        menuItem.addEventListener('click', () => {
            removeAllHoverTooltips();
            focusOnArgument(child);
        });

        if (child.sentiment === 1) {
            leftMenuDiv.appendChild(menuItem);
        } else {
            rightMenuDiv.appendChild(menuItem);
        }

        menuItem.addEventListener('mouseenter', () => {
            const path = document.querySelector(`path[data-id="${child.id}"]`);
            if (path) {
                path.setAttribute("fill", "orange");
            }
            menuItem.style.backgroundColor = '#d0d0d0';
        });

        menuItem.addEventListener('mouseleave', () => {
            const path = document.querySelector(`path[data-id="${child.id}"]`);
            if (path) {
                const weightFactor = 1 - (child.weight / 10);
                const color = child.sentiment === 1 ? `rgba(0, 128, 0, ${weightFactor})` : `rgba(255, 0, 0, ${weightFactor})`;
                path.setAttribute("fill", color);
            }
            menuItem.style.backgroundColor = isEven ? '#f0f0f0' : '#e0e0e0';
        });
    });
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


// Add language selector
const languageSelector = document.createElement('select');
languageSelector.id = 'languageSelector';
const enOption = document.createElement('option');
enOption.value = 'en';
enOption.textContent = 'English';
const faOption = document.createElement('option');
faOption.value = 'fa';
faOption.textContent = 'فارسی';
languageSelector.appendChild(enOption);
languageSelector.appendChild(faOption);

// Insert the language selector at the beginning of the body
// document.body.insertBefore(languageSelector, document.body.firstChild);

languageSelector.addEventListener('change', (event) => {
  currentLocale = event.target.value;
  loadLocale(currentLocale);
});

function loadLocale(locale) {
  fetch(`https://cdn.jsdelivr.net/gh/eledah/mokaleme@latest/locales/${locale}.json`)
    .then(response => response.json())
    .then(data => {
      localeData = data;
      updateLanguage();
    })
    .catch(error => console.error('Error loading locale:', error));
}

function updateLanguage() {
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = currentLocale === 'fa' ? 'rtl' : 'ltr';
  
  if (currentLocale === 'fa') {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    document.body.style.fontFamily = 'Vazirmatn, sans-serif';
  } else {
    document.body.style.fontFamily = '';
  }

  backButton.textContent = localeData.back;
  updateMenus(currentArgument);
}

console.log(currentLocale)

// Load default locale
loadLocale(currentLocale);

// Load output_language.csv by default
fetch('https://cdn.jsdelivr.net/gh/eledah/mokaleme@latest/output_language.csv')
  .then(response => response.text())
  .then(csvData => buildGraph(csvData))
  .catch(error => console.error('Error loading renewable.csv:', error));