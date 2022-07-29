
/** @type {CanvasRenderingContext2D} */
let gridCtx = document.getElementById("grid").getContext("2d");
/** @type {CanvasRenderingContext2D} */
let brushCtx = document.getElementById("brush").getContext("2d");

let grid = Array(9).fill(null);
let rule = null;

let brushColor = 0;
let brushShape = 0;
let brushErase = false;
let moduleState = "edit";
let showRule = false;

let stageNumber = 1;
let stageTotal = 5;
let challenge = [];

function resetModule() {
    rule = randomRule();
    console.log("The rule is: " + rule.descSingular);

    brushColor = 0;
    brushShape = 0;
    brushErase = false;

    //Fix display resolution on canvas
    setCanvasScale(document.getElementById("grid"), gridCtx, 600);
    setCanvasScale(document.getElementById("brush"), brushCtx, 200);

    //TODO fallback to default if examples can't be found
    let examples = generateExamples(1,0);
    if (examples.length == 1) {
        setDisplayGrid(examples[0])
    } else {
        setDisplayGrid(Array(9).fill(null))
    }

    setModuleState("edit");
}

function setCanvasScale(canvas, ctx, worldWidth) {
    let width = canvas.clientWidth * window.devicePixelRatio;
    let height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;

    let factor = width / worldWidth;
    ctx.resetTransform();
    ctx.scale(factor, factor);
}

function refreshDisplay() {
    let isValid = (rule && rule.match(grid));

    showRule = document.getElementById("showrule").checked

    // Update rule string, status string, and Y/N button highlight
    let ruleString = document.getElementById("rulestring");
    let validString = document.getElementById("validstring");
    let yesButton = document.getElementById("btn-yes");
    let noButton = document.getElementById("btn-no");
    let readyButton = document.getElementById("btn-ready");

    if (rule) {
        if (showRule || moduleState == "solved" || moduleState == "failed") {
            ruleString.innerText = `Rule: ${rule.descSingular}`;
        } else {
            ruleString.innerText = "Rule: ?"
        }

        if (moduleState == "challenge") {
            validString.innerText = `Challenge mode - ${stageNumber} / ${challenge.length} solved`
            yesButton.classList.remove("highlight");
            noButton.classList.remove("highlight");
            readyButton.classList.add("highlight");
        } else {
            let status = "";
            if (moduleState == "solved") status = "SOLVED! ";
            if (moduleState == "failed") status = "INCORRECT - ";
            
            if (isValid) {
                validString.innerText = status + "This pattern is valid"
                yesButton.classList.add("highlight");
                noButton.classList.remove("highlight");
            } else {
                validString.innerText = status + "This pattern is invalid"
                yesButton.classList.remove("highlight");
                noButton.classList.add("highlight");
            }
            readyButton.classList.remove("highlight");
        }
    } else {
        ruleString.innerText = "No rule";
        validString.innerText = "";
    }

    // Update status light
    let statusLight = document.getElementById("status-light");
    if (moduleState == "solved") {
        statusLight.classList.add("solve")
        statusLight.classList.remove("strike")
    } else if (moduleState == "failed") {
        statusLight.classList.remove("solve")
        statusLight.classList.add("strike")
    } else {
        statusLight.classList.remove("solve")
        statusLight.classList.remove("strike")
    }

    // Draw grid
    gridCtx.fillStyle = "black";
    gridCtx.fillRect(0, 0, 600, 600);

    gridCtx.save();

    drawGridLines(gridCtx);

    for (let i=0; i<9; i++) {
        let x = (i % 3) * 200;
        let y = (Math.floor(i / 3)) * 200;

        drawSymbol(gridCtx, grid[i], x, y)
    }

    gridCtx.restore();

    // Draw brush indicator
    brushCtx.fillStyle = "black";
    brushCtx.fillRect(0, 0, 200, 200);

    if (moduleState == "challenge") {
        // Stage indicator
        brushCtx.save();

        brushCtx.fillStyle = "white";
        brushCtx.textAlign = "center";
        brushCtx.textBaseline = "middle";
        brushCtx.font = "80px Courier New"

        brushCtx.fillText(`${stageNumber}/${challenge.length}`, 100, 105, 180);

        brushCtx.restore();
    } else {
        // Brush
        if (!brushErase) {
            brushCtx.save();

            drawSymbol(brushCtx, {color: brushColor, shape: brushShape}, 0, 0);

            brushCtx.restore();
        }
    }
}

function setModuleState(newState) {
    moduleState = newState;

    if (moduleState == "challenge") {
        generateChallenge();
    }

    refreshDisplay();
}

function generateChallenge() {
    // TODO better challenge generation

    challenge = generateExamples(stageTotal-1, stageTotal-1);
    shuffleArray(challenge);
    challenge = challenge.slice(0,stageTotal);

    setDisplayGrid(challenge[0]);

    stageNumber = 0;
}

function setColor(newColor) {brushColor = newColor; brushErase = false; refreshDisplay()}
function setShape(newShape) {brushShape = newShape; brushErase = false; refreshDisplay()}

function erasePress() {
    if (moduleState == "challenge") return;

    if (brushErase) {
        setDisplayGrid(Array(9).fill(null));
    } else {
        brushErase = true;
        refreshDisplay();
    }
}

function buttonPress(button) {
    let examples;

    if (moduleState == "challenge") {
        if (button == "ready") {
            setModuleState("edit")
        } else if (button == "y" || button == "n") {
            let answer = (button == "y");
            let actual = rule.match(grid);

            if (answer == actual) {
                stageNumber++;

                if (stageNumber < challenge.length) {
                    setDisplayGrid(challenge[stageNumber]);
                } else {
                    setModuleState("solved")
                    console.log("Solved!");
                }

                
            } else {
                setModuleState("failed")
                console.log("The grid was:\n" + gridToString(grid));
                console.log(`This was ${actual ? "valid" : "invalid"} but you pressed "${answer ? "Y" : "N"}".`);
            }
        }
    } else {
        switch (button) {
            case "y":
                examples = generateExamples(1,0);
                if (examples.length == 1)
                    setDisplayGrid(examples[0]);
                break;
            case "n":
                examples = generateExamples(0,1);
                if (examples.length == 1)
                    setDisplayGrid(examples[0]);
                break;
            case "ready":
                if (moduleState == "edit") {
                    setModuleState("challenge")
                } else {
                    resetModule();
                }
                break;
        }
    }
}

function gridOnClick(event) {
    if (moduleState == "challenge") return;

    let x = event.offsetX / event.target.clientWidth;
    let y = event.offsetY / event.target.clientWidth;

    let c = Math.min(Math.max(0, Math.floor(x * 3)), 2);
    let r = Math.min(Math.max(0, Math.floor(y * 3)), 2);
    let i = c + r*3;

    if (brushErase) {
        grid[i] = null;
    } else {
        grid[i] = {color: brushColor, shape: brushShape};
    }

    refreshDisplay();
}

function randomGrid() {
    let g = Array(9).fill(null);

    let fillTarget = Math.floor(Math.random()*7) + 3;

    for (let i=0; i<9; i++) {
        if (Math.random() < fillTarget / (9-i)) {
            g[i] = {color: Math.floor(Math.random()*3), shape: Math.floor(Math.random()*3)}
            fillTarget--;
        }
    }

    return g;
}

function setDisplayGrid(g) {
    for (let i=0; i<9; i++) {
        grid[i] = g[i];
    }
    refreshDisplay();
}

function generateExamples(validCount, invalidCount) {
    if (!rule) return [];

    let validGrids = [];
    let invalidGrids = [];

    let attempts = 0;
    const timeout = 500;
    while (attempts < timeout && (validGrids.length < validCount || invalidGrids.length < invalidCount)) {
        let g = randomGrid();
        if (rule.match(g)) {
            if (validGrids.length < validCount) {
                validGrids.push(g);
            }
        } else {
            if (invalidGrids.length < invalidCount) {
                invalidGrids.push(g);
            }
        }
        attempts ++;
    }

    if (validGrids.length < validCount || invalidGrids.length < invalidCount) {
        console.warn("Failed to generate enough examples")
    } else {
        console.debug(`Generated examples after ${attempts} attempts`)
    }

    return validGrids.concat(invalidGrids);
}

function drawSymbol(ctx, symbol, x, y) {
    if (!symbol) return;

    switch (symbol.color) {
        case 0: ctx.fillStyle = "red"; break;
        case 1: ctx.fillStyle = "yellow"; break;
        case 2: ctx.fillStyle = "#194fff"; break;
    }

    switch (symbol.shape) {
        case 0:
            ctx.beginPath();
            ctx.arc(x+100, y+100, 70, 0, 2*Math.PI)
            ctx.fill();
            break;
        case 1:
            ctx.beginPath();
            ctx.moveTo(x+30, y+160);
            ctx.lineTo(x+100, y+30);
            ctx.lineTo(x+170, y+160);
            ctx.closePath();
            ctx.fill();
            break;
        case 2:
            ctx.fillRect(x+40, y+40, 120, 120);
            break;
    }
}

function drawGridLines(ctx) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = "16";
    ctx.lineCap = "round";
    strokeLine(ctx, 200, 30, 200, 570)
    strokeLine(ctx, 400, 30, 400, 570)
    strokeLine(ctx, 30, 200, 570, 200)
    strokeLine(ctx, 30, 400, 570, 400)
}

function strokeLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function randomRuleFragmentOfType(fragType, tags) {
    tags ??= new Set();

    let choice = null;
    let choiceIndex = -1;
    let weight = 0;

    let options = ruleDict[fragType];

    for (let i=0; i<options.length; i++) {
        let e = options[i]

        // Check conflicts
        if (e.tags) {
            let conflict = false;
            for (let t of e.tags) {
                if (tags.has(t)) {
                    conflict = true;
                    break;
                }
            }
            if (conflict) continue;
        }

        // Skip empty entries (debug)
        if (!e.match) continue;

        let newWeight = weight + (e.weight ?? 0);
        let rand = Math.random() * newWeight;

        if (rand > weight) {
            choice = e;
            choiceIndex = i;
        }

        weight = newWeight;
    }

    if (!choice) {
        throw new Error(`No valid choices for ${fragType}`);
    }

    // Update tags

    if (choice.tags) {
        for (let t of choice.tags) {
            tags.add(t);
        }
    }

    // Randomize children and attribute
    
    let result = {
        type: fragType,
        index: choiceIndex,
        children: [],
        attribute: 0,
    }

    if (choice.childTypes) {
        for (let i=0; i<choice.childTypes.length; i++) {
            let c = choice.childTypes[i];

            let newChild;
            if (choice.separateTags) {
                let subtags = new Set();

                // position tag is global
                if (tags.has("position")) subtags.add("position");

                newChild = randomRuleFragmentOfType(c, subtags)
            } else {
                newChild = randomRuleFragmentOfType(c, tags)
            }

            result.children.push(newChild);
        }
    }

    if (choice.attribute) {
        result.attribute = Math.floor(Math.random() * choice.attribute.length);
    }

    return result;
}

function instantiateRule(data) {
    let template = ruleDict[data.type][data.index];

    if (!template) throw new Error("Rule template not found");

    let result = {
        descSingular: template.descSingular ?? "",
        descPlural: template.descPlural ?? template.descSingular ?? "",
        rawMatch: template.match ?? (_ => true),
        children: [],
        attribute: data.attribute ?? 0,
        match: null,
    }
    
    if (template.childTypes) {
        for (let i=0; i<data.children.length; i++) {
            let newChild = instantiateRule(data.children[i])
            result.children.push(newChild);

            // Replace %n with singular and $n with plural
            result.descSingular = result.descSingular.replace("%"+(i+1), newChild.descSingular);
            result.descPlural = result.descPlural.replace("%"+(i+1), newChild.descSingular);

            result.descSingular = result.descSingular.replace("$"+(i+1), newChild.descPlural);
            result.descPlural = result.descPlural.replace("$"+(i+1), newChild.descPlural);

            // Append tags TODO
        }
    }

    if (template.attribute) {
        // Replace @ with attribute text
        result.descSingular = result.descSingular.replace("@", template.attribute[result.attribute]);
        result.descPlural = result.descPlural.replace("@", template.attribute[result.attribute]);
    }

    result.match = function(g, x) {
        return this.rawMatch(g, x, this.children.map(e => e.match.bind(e, g)), this.attribute)
    }

    return result;
}

function randomRule() {
    let data = randomRuleFragmentOfType("rule");
    return instantiateRule(data);
}

/**
* @typedef {{color: 0|1|2, shape: 0|1|2}[]} ZendoGrid
* @typedef {{
*   childTypes: string[],
*   attribute: string[],
*   descSingular: string,
*   descPlural: string,
*   tags: string[],
*   separateTags: bool,
*   weight: int,
*   match: (grid: ZendoGrid, arg: any, child: ((x:any) => any)[], attr: int)
* }} RuleTemplate
*/

/**
* @type {Object.<string, RuleTemplate[]>}
*/
let ruleDict = {
    rule: [
        // Rule of the form "All X are Y"
        {
            childTypes: ["noun","nounPred"],
            descSingular: "Every %1 is %2",
            weight: 7,
            match: (g,_,child) => indices(g).every(i => !child[0](i) || child[1](i))
        },
        // Rule of the form "Some X is Y"
        {
            childTypes: ["noun","nounPred"],
            descSingular: "There is a %1 that is %2",
            weight: 7,
            match: (g,_,child) => indices(g).some(i => child[0](i) && child[1](i))
        },
        // Rule of the form "No X is Y"
        {
            childTypes: ["noun","nounPred"],
            descSingular: "No %1 is %2",
            weight: 7,
            match: (g,_,child) => indices(g).every(i => !child[0](i) || !child[1](i))
        },
        // Rule of the form "For every group X, Y applies to the group"
        {
            childTypes: ["group","groupPred"],
            descSingular: "%1 %2",
            weight: 20,
            match: (g,_,child) => child[0]().every(a => a.length == 0 || child[1](a))
        },
        // Rule of the form "There is some row whose members are all Y"
        {
            childTypes: ["noun"],
            descSingular: "There is a row filled with $1",
            tags: ["position"],
            weight: 7,
            match: (g,_,child) => [0,3,6].some(r => [r+0,r+1,r+2].every(i => child[0](i)))
        },
        // Rule of the form "There is some column whose members are all Y"
        {
            childTypes: ["noun"],
            descSingular: "There is a column filled with $1",
            tags: ["position"],
            weight: 7,
            match: (g,_,child) => [0,1,2].some(c => [c+0,c+3,c+6].every(i => child[0](i)))
        },
        // Rule of the form "There are more X than Y"
        // {
        //     childTypes: ["noun","noun"],
        //     descSingular: "There are more $1 than $2",
        //     weight: 10,
        //     match: (g,_,child) => arrayCount(indices(g), i => child[0](i)) > arrayCount(indices(g), i => child[1](i))
        // },
    ],
    noun: [
        // Noun for a specific color
        {
            attribute: ["red","yellow","blue"],
            descSingular: "@ symbol",
            descPlural: "@ symbols",
            tags: ["color"],
            weight: 20,
            match: (g,i,child,attr) => g[i] != null && g[i].color == attr
        },
        // Noun for a specific shape
        {
            attribute: ["circle","triangle","square"],
            tags: ["shape"],
            descSingular: "@",
            descPlural: "@s",
            weight: 20,
            match: (g,i,child,attr) => g[i] != null && g[i].shape == attr
        },
        // Noun for a specific row
        {
            attribute: ["top","middle","bottom"],
            descSingular: "symbol in the @ row",
            descPlural: "symbols in the @ row",
            tags: ["position"],
            weight: 20,
            match: (g,i,child,attr) => g[i] != null && Math.floor(i/3) == attr
        },
        // Noun for a specific column
        {
            attribute: ["left","middle","right"],
            descSingular: "symbol in the @ column",
            descPlural: "symbols in the @ column",
            tags: ["position"],
            weight: 20,
            match: (g,i,child,attr) => g[i] != null && i%3 == attr
        },
        // Noun for symbols on the rising diagonal
        // Noun for symbols on the falling diagonal
        // Noun for empty cells
        {
            descSingular: "blank cell",
            descPlural: "blank cells",
            tags: ["shape","color"],
            weight: 10,
            match: (g,i) => g[i] == null
        },
    ],
    nounPred: [
        // Predicate for a specific color
        {
            attribute: ["red","yellow","blue"],
            descSingular: "@",
            tags: ["color"],
            weight: 10,
            match: (g,i,child,attr) => g[i] != null && g[i].color == attr
        },
        // Predicate for a specific shape
        {
            attribute: ["circle","triangle","square"],
            descSingular: "a @",
            descPlural: "@s",
            tags: ["shape"],
            weight: 10,
            match: (g,i,child,attr) => g[i] != null && g[i].shape == attr
        },
        // Predicate for a specific row
        {
            attribute: ["top","middle","bottom"],
            descSingular: "in the @ row",
            tags: ["position"],
            weight: 10,
            match: (g,i,child,attr) => Math.floor(i/3) == attr
        },
        // Predicate for a specific column
        {
            attribute: ["left","middle","right"],
            descSingular: "in the @ column",
            tags: ["position"],
            weight: 10,
            match: (g,i,child,attr) => i%3 == attr
        },
        // Predicate for the rising diagonal
        // Predicate for the falling diagonal
        // Predicate for adjacency to a noun
        {
            childTypes: ["noun"],
            descSingular: "adjacent to a %1",
            tags: ["position"],
            separateTags: true,
            weight: 15,
            match: (g,i,child) => (
                (i > 2 && child[0](i-3))   ||
                (i < 6 && child[0](i+3))   ||
                (i%3 > 0 && child[0](i-1)) ||
                (i%3 < 2 && child[0](i+1))
            )
        },
        // Predicate for being directly to the left of a noun
        // Predicate for being directly to the right of a noun
        // Predicate for being directly above of a noun
        // Predicate for being directly below of a noun
        // Predicate for being in a column left of a noun
        // Predicate for being in a column right of a noun
        // Predicate for being in a row above a noun
        // Predicate for being in a row below a noun
        // Predicate for being in the same column as a noun
        // Predicate for being in the same row as a noun
    ],    
    group: [
        // All symbols
        {
            descSingular: "All symbols",
            weight: 20,
            match: (g) => [indices(g).filter(i => g[i] != null)]
        },
        // Symbols in the same row
        {
            descSingular: "Symbols in the same row",
            tags: ["position"],
            weight: 10,
            match: (g) => [0,3,6].map(r => [r+0,r+1,r+2].filter(i => g[i] !== null))
        },
        // Symbols in the same column
        {
            descSingular: "Symbols in the same column",
            tags: ["position"],
            weight: 10,
            match: (g) => [0,1,2].map(r => [r+0,r+3,r+6].filter(i => g[i] !== null))
        },
        // Symbols with the same color
        {
            descSingular: "Symbols with the same color",
            tags: ["color"],
            weight: 10,
            match: (g) => [0,1,2].map(c => indices(g).filter(i => g[i] != null && g[i].color === c))
        },
        // Symbols with the same shape
        {
            descSingular: "Symbols with the same shape",
            tags: ["shape"],
            weight: 10,
            match: (g) => [0,1,2].map(s => indices(g).filter(i => g[i] != null && g[i].shape === s))
        },
        // Identical symbols
        {
            descSingular: "Identical symbols",
            tags: ["shape","color"],
            weight: 10,
            match: (g) => [0,1,2,3,4,5,6,7,8].map(v => indices(g).filter(i =>
                g[i] != null && g[i].shape === Math.floor(v/3) && g[i].color === v%3
            ))
        },
        // Pairs of adjacent symbols
        {
            descSingular: "Adjacent symbols",
            tags: ["position"],
            weight: 20,
            match: (g) => (
                [[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[0,3],[3,6],[1,4],[4,7],[2,5],[5,8]]
                .filter(p => g[p[0]] != null && g[p[1]] != null)
            )
        },
    ],
    groupPred: [
        // All the same color
        {
            descSingular: "are the same color",
            tags: ["color"],
            weight: 20,
            match: (g,a) => [0,1,2].some(c => a.every(i => g[i].color == c))
        },
        // All different colors
        {
            descSingular: "are different colors",
            tags: ["color"],
            weight: 10,
            match: (g,a) => [0,1,2].every(c => arrayCount(a, i => g[i].color == c) <= 1)
        },
        // All the same shape
        {
            descSingular: "are the same shape",
            tags: ["shape"],
            weight: 20,
            match: (g,a) => [0,1,2].some(s => a.every(i => g[i].shape == s))
        },
        // All different shapes
        {
            descSingular: "are different shapes",
            tags: ["shape"],
            weight: 10,
            match: (g,a) => [0,1,2].every(s => arrayCount(a, i => g[i].shape == s) <= 1)
        },
        // All the same color or shape
        {
            descSingular: "are the same color or shape",
            tags: ["color","shape"],
            weight: 20,
            match: (g,a) => (
                [0,1,2].some(c => a.every(i => g[i].color == c)) ||
                [0,1,2].some(s => a.every(i => g[i].shape == s))
            )
        },
        // All identical
        {
            descSingular: "are identical",
            tags: ["color","shape"],
            weight: 0,
            match: (g,a) => (
                [0,1,2].some(c => a.every(i => g[i].color == c)) &&
                [0,1,2].some(s => a.every(i => g[i].shape == s))
            )
        },
        // All contiguous
        {
            descSingular: "form a connected cluster",
            tags: ["position"],
            weight: 20,
            match: (g,a) => checkConnected(a)
        }
    ]
}

function arrayCount(a, condition) {
    let count = 0;
    for (let i=0; i<a.length; i++) {
        if (condition(a[i], i)) count++
    }
    return count
}

function shuffleArray(a) {
    for (let i=0; i<a.length; i++) {
        let j = Math.floor(Math.random() * (a.length - i)) + i;

        let temp = a[i];
        a[i] = a[j];
        a[j] = temp;
    }

    return a;
}

function checkConnected(cells) {
    if (cells.length == 0) return true;

    const targets = new Set();

    for (let i of cells) {
        targets.add(i);
    }

    function _floodFill(i) {
        if (!targets.has(i)) return;

        targets.delete(i);

        if (i > 2)   _floodFill(i-3);
        if (i < 6)   _floodFill(i+3);
        if (i%3 > 0) _floodFill(i-1);
        if (i%3 < 2) _floodFill(i+1);
    }

    _floodFill(cells[0]);

    return (targets.size == 0);
}

function indices(a) {
    return a.map((_,i) => i);
}

function gridToString(g) {
    let cells = g.map(e => e == null ? "  " : ("ryb"[e.color] + "CTS"[e.shape]));
    cells = cells.map((e,i) => (i == 8) ? e : (e + (i%3 == 2 ? "\n--+--+--\n" : "|")));
    return cells.join("");
}

resetModule();