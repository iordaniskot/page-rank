document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const graphContainer = document.getElementById('graph-container');
    const addNodeBtn = document.getElementById('add-node');
    const calculateBtn = document.getElementById('calculate');
    const resetBtn = document.getElementById('reset');
    const dampingSlider = document.getElementById('damping');
    const dampingValue = document.getElementById('damping-value');
    const iterationsSlider = document.getElementById('iterations');
    const iterationsValue = document.getElementById('iterations-value');
    
    // State variables
    let nodes = [];
    let edges = [];
    let nextNodeId = 1;
    let isDragging = false;
    let dragStartNode = null;
    let dragLine = null;
    let linkModeIndicator = null;
    
    // Show visual feedback when SHIFT is pressed (link mode)
    document.addEventListener('keydown', (e) => {
        if (e.shiftKey && !linkModeIndicator) {
            linkModeIndicator = document.createElement('div');
            linkModeIndicator.textContent = 'Link Mode: Click and drag between nodes to create links';
            linkModeIndicator.style.position = 'absolute';
            linkModeIndicator.style.top = '10px';
            linkModeIndicator.style.left = '50%';
            linkModeIndicator.style.transform = 'translateX(-50%)';
            linkModeIndicator.style.backgroundColor = 'rgba(255, 102, 0, 0.9)';
            linkModeIndicator.style.color = 'white';
            linkModeIndicator.style.padding = '8px 15px';
            linkModeIndicator.style.borderRadius = '4px';
            linkModeIndicator.style.zIndex = '1000';
            linkModeIndicator.style.fontWeight = 'bold';
            graphContainer.appendChild(linkModeIndicator);
            
            // Add a subtle border to all nodes to indicate they can be connected
            nodes.forEach(node => {
                node.element.style.boxShadow = '0 0 8px rgba(255, 102, 0, 0.8)';
            });
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (!e.shiftKey && linkModeIndicator) {
            if (linkModeIndicator.parentNode) {
                linkModeIndicator.parentNode.removeChild(linkModeIndicator);
            }
            linkModeIndicator = null;
            
            // Remove the highlight from nodes
            nodes.forEach(node => {
                node.element.style.boxShadow = '';
            });
        }
    });
    
    // Update settings display
    dampingSlider.addEventListener('input', () => {
        dampingValue.textContent = dampingSlider.value;
    });
    
    iterationsSlider.addEventListener('input', () => {
        iterationsValue.textContent = iterationsSlider.value;
    });
    
    // Add a new node
    addNodeBtn.addEventListener('click', () => {
        createNode();
    });
    
    // Calculate PageRank
    calculateBtn.addEventListener('click', () => {
        calculatePageRank();
    });
    
    // Reset the graph
    resetBtn.addEventListener('click', () => {
        resetGraph();
    });
    
    // Create a node at a random position
    function createNode() {
        const nodeId = nextNodeId++;
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node';
        nodeElement.dataset.id = nodeId;
        
        // Create node content
        const contentSpan = document.createElement('span');
        contentSpan.textContent = `Page ${nodeId}`;
        
        const pagerankDiv = document.createElement('div');
        pagerankDiv.className = 'pagerank';
        pagerankDiv.textContent = '0';
        
        // Create delete button
        const deleteButton = document.createElement('div');
        deleteButton.className = 'delete-node';
        deleteButton.innerHTML = '&times;'; // × symbol
        deleteButton.title = 'Delete node';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNode(nodeId);
        });
        
        // Add elements to node
        nodeElement.appendChild(contentSpan);
        nodeElement.appendChild(pagerankDiv);
        nodeElement.appendChild(deleteButton);
        
        // Position the node randomly within the container
        const containerRect = graphContainer.getBoundingClientRect();
        const padding = 60; // Ensure nodes don't appear too close to the edges
        const x = Math.random() * (containerRect.width - 2 * padding) + padding;
        const y = Math.random() * (containerRect.height - 2 * padding) + padding;
        
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        
        // Store node data
        nodes.push({
            id: nodeId,
            element: nodeElement,
            x: x,
            y: y,
            rank: 1 / nextNodeId // Initialize with equal distribution
        });
        
        graphContainer.appendChild(nodeElement);
        
        // Make the node draggable
        setupNodeDragging(nodeElement);
        
        // Setup node connection drag
        setupNodeConnections(nodeElement);
    }
    
    // Make nodes draggable
    function setupNodeDragging(nodeElement) {
        let isDraggingNode = false;
        let offsetX, offsetY;
        
        nodeElement.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left mouse button
            if (e.shiftKey) return; // Don't drag when SHIFT is pressed (reserved for creating links)
            
            isDraggingNode = true;
            offsetX = e.clientX - nodeElement.getBoundingClientRect().left;
            offsetY = e.clientY - nodeElement.getBoundingClientRect().top;
            nodeElement.style.zIndex = '1000';
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });
        
        function onMouseMove(e) {
            if (!isDraggingNode) return;
            
            const containerRect = graphContainer.getBoundingClientRect();
            const x = e.clientX - containerRect.left - offsetX;
            const y = e.clientY - containerRect.top - offsetY;
            
            // Keep node within container bounds
            const nodeWidth = nodeElement.offsetWidth;
            const nodeHeight = nodeElement.offsetHeight;
            const maxX = containerRect.width - nodeWidth;
            const maxY = containerRect.height - nodeHeight;
            
            const boundedX = Math.max(0, Math.min(maxX, x));
            const boundedY = Math.max(0, Math.min(maxY, y));
            
            nodeElement.style.left = `${boundedX}px`;
            nodeElement.style.top = `${boundedY}px`;
            
            // Update node position in state
            const nodeId = parseInt(nodeElement.dataset.id);
            const nodeData = nodes.find(n => n.id === nodeId);
            if (nodeData) {
                nodeData.x = boundedX;
                nodeData.y = boundedY;
            }
            
            // Update connected edges
            updateConnectedEdges(nodeId);
        }
        
        function onMouseUp() {
            isDraggingNode = false;
            nodeElement.style.zIndex = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }
    
    // Setup drag to create connections between nodes
    function setupNodeConnections(nodeElement) {
        // We'll use a simpler approach - shift+click and drag
        nodeElement.addEventListener('mousedown', (e) => {
            // Use shift+click instead of right-click for better compatibility
            if (!e.shiftKey) return;
            e.preventDefault();
            
            const nodeId = parseInt(nodeElement.dataset.id);
            dragStartNode = nodes.find(n => n.id === nodeId);
            
            // Create a temporary line for dragging
            dragLine = document.createElement('div');
            dragLine.className = 'edge';
            // Add a special class to make it more visible during dragging
            dragLine.classList.add('dragging-edge');
            graphContainer.appendChild(dragLine);
            
            // Set initial position of the line
            const rect = nodeElement.getBoundingClientRect();
            const containerRect = graphContainer.getBoundingClientRect();
            const startX = rect.left + rect.width / 2 - containerRect.left;
            const startY = rect.top + rect.height / 2 - containerRect.top;
            
            // Show instructions temporarily
            const instruction = document.createElement('div');
            instruction.className = 'drag-instruction';
            instruction.textContent = 'Drag to another node to create link';
            instruction.style.position = 'absolute';
            instruction.style.top = `${startY - 30}px`;
            instruction.style.left = `${startX}px`;
            instruction.style.backgroundColor = 'rgba(0,0,0,0.7)';
            instruction.style.color = 'white';
            instruction.style.padding = '5px 10px';
            instruction.style.borderRadius = '4px';
            instruction.style.fontSize = '12px';
            instruction.style.zIndex = '1000';
            graphContainer.appendChild(instruction);
            
            function onDragMove(e) {
                if (!dragStartNode || !dragLine) return;
                
                const endX = e.clientX - containerRect.left;
                const endY = e.clientY - containerRect.top;
                
                // Calculate line properties
                const dx = endX - startX;
                const dy = endY - startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                // Update line position and rotation
                dragLine.style.left = `${startX}px`;
                dragLine.style.top = `${startY}px`;
                dragLine.style.width = `${length}px`;
                dragLine.style.transform = `rotate(${angle}rad)`;
                dragLine.style.backgroundColor = '#ff9900'; // More visible color
                dragLine.style.height = '3px'; // Make it thicker
                
                // Check if hovering over a potential target node and highlight it
                const elements = document.elementsFromPoint(e.clientX, e.clientY);
                let isOverTargetNode = false;
                
                // Reset all node highlights first
                nodes.forEach(n => {
                    if (n.id !== dragStartNode.id) {
                        n.element.style.boxShadow = '';
                    }
                });
                
                // Find if we're over a valid target node
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].classList.contains('node') && 
                        parseInt(elements[i].dataset.id) !== dragStartNode.id) {
                        // Highlight the potential target
                        elements[i].style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.8)';
                        isOverTargetNode = true;
                        break;
                    }
                }
                
                // Change the line color based on whether we're over a valid target
                if (isOverTargetNode) {
                    dragLine.style.backgroundColor = '#2ecc71'; // Green for valid
                    dragLine.style.height = '4px'; // Thicker for emphasis
                } else {
                    dragLine.style.backgroundColor = '#ff9900'; // Orange for dragging
                    dragLine.style.height = '3px';
                }
            }
            
            function onDragEnd(e) {
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
                
                if (dragLine) {
                    graphContainer.removeChild(dragLine);
                    dragLine = null;
                }
                
                if (instruction && instruction.parentNode) {
                    instruction.parentNode.removeChild(instruction);
                }
                
                // Find if the mouse is over a node
                // We'll get all elements at the point and find a node
                const elements = document.elementsFromPoint(e.clientX, e.clientY);
                let targetNodeElement = null;
                
                for (let i = 0; i < elements.length; i++) {
                    if (elements[i].classList.contains('node') && 
                        parseInt(elements[i].dataset.id) !== dragStartNode.id) {
                        targetNodeElement = elements[i];
                        break;
                    }
                }
                
                if (targetNodeElement) {
                    const targetNodeId = parseInt(targetNodeElement.dataset.id);
                    createEdge(dragStartNode.id, targetNodeId);
                    
                    // Provide visual feedback that the link was created
                    targetNodeElement.style.boxShadow = '0 0 10px #00ff00';
                    setTimeout(() => {
                        targetNodeElement.style.boxShadow = '';
                    }, 500);
                }
                
                dragStartNode = null;
            }
            
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
        });
    }
    
    // Create an edge between two nodes
    function createEdge(sourceId, targetId) {
        // Check if this edge already exists
        const edgeExists = edges.some(edge => 
            edge.source === sourceId && edge.target === targetId
        );
        
        if (edgeExists) return;
        
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode) return;
        
        // Create edge element
        const edgeElement = document.createElement('div');
        edgeElement.className = 'edge';
        
        // Add tooltip for edge information
        const tooltip = document.createElement('div');
        tooltip.className = 'edge-tooltip';
        tooltip.textContent = 'Click to delete';

        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '3px 6px';
        tooltip.style.borderRadius = '3px';
        tooltip.style.fontSize = '10px';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s';
        tooltip.style.zIndex = '100';
        tooltip.style.pointerEvents = 'none';
        edgeElement.appendChild(tooltip);
        
        // Add hover event for the tooltip
        edgeElement.addEventListener('mouseover', (e) => {
            tooltip.style.opacity = '1';
            // Position the tooltip near the cursor
            const rect = edgeElement.getBoundingClientRect();
            const containerRect = graphContainer.getBoundingClientRect();
            tooltip.style.left = `${e.clientX - containerRect.left}px`;
            tooltip.style.top = `${e.clientY - containerRect.top - 25}px`;
        });
        
        edgeElement.addEventListener('mousemove', (e) => {
            // Update tooltip position as the mouse moves
            const containerRect = graphContainer.getBoundingClientRect();
            tooltip.style.left = `${e.clientX - containerRect.left}px`;
            tooltip.style.top = `${e.clientY - containerRect.top - 25}px`;
        });
        
        edgeElement.addEventListener('mouseout', () => {
            tooltip.style.opacity = '0';
        });
        
        // Add click event to delete the edge
        edgeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteEdge(sourceId, targetId);
        });
        
        graphContainer.appendChild(edgeElement);
        
        // Store edge data
        const edge = {
            source: sourceId,
            target: targetId,
            element: edgeElement
        };
        
        edges.push(edge);
        
        // Position the edge
        positionEdge(edge);
    }
    
    // Delete an edge between nodes
    function deleteEdge(sourceId, targetId) {
        const edgeIndex = edges.findIndex(edge => 
            edge.source === sourceId && edge.target === targetId
        );
        
        if (edgeIndex === -1) return;
        
        const edge = edges[edgeIndex];
        
        // Remove the edge element
        if (edge.element && edge.element.parentNode) {
            edge.element.parentNode.removeChild(edge.element);
        }
        
        // Remove from the edges array
        edges.splice(edgeIndex, 1);
        
        // Show a temporary notification
        const notification = document.createElement('div');
        notification.textContent = `Link deleted: Page ${sourceId} → Page ${targetId}`;
        notification.style.position = 'absolute';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#e74c3c';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontWeight = 'bold';
        graphContainer.appendChild(notification);
        
        // Fade out the notification after a short delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 2000);
        
        // Recalculate PageRank to update the visualization
        calculatePageRank();
    }
    
    // Delete a node and its connected edges
    function deleteNode(nodeId) {
        // Find the node
        const nodeIndex = nodes.findIndex(node => node.id === nodeId);
        if (nodeIndex === -1) return;
        
        // Get node reference
        const node = nodes[nodeIndex];
        
        // Remove all edges connected to this node
        const edgesToRemove = edges.filter(edge => 
            edge.source === nodeId || edge.target === nodeId
        );
        
        // Remove each edge element from the DOM
        edgesToRemove.forEach(edge => {
            if (edge.element && edge.element.parentNode) {
                edge.element.parentNode.removeChild(edge.element);
            }
        });
        
        // Remove edges from the array
        edges = edges.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
        );
        
        // Remove the node element from the DOM
        if (node.element && node.element.parentNode) {
            node.element.parentNode.removeChild(node.element);
        }
        
        // Remove from nodes array
        nodes.splice(nodeIndex, 1);
        
        // Show notification
        const notification = document.createElement('div');
        notification.textContent = `Node deleted: Page ${nodeId}`;
        notification.style.position = 'absolute';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#e74c3c';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.fontWeight = 'bold';
        graphContainer.appendChild(notification);
        
        // Fade out notification
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 2000);
        
        // If there are still nodes, recalculate PageRank
        if (nodes.length > 0) {
            calculatePageRank();
        } else {
            // If no nodes left, clear the analytics table
            const tableBody = document.getElementById('ranking-table-body');
            if (tableBody) {
                tableBody.innerHTML = '';
            }
        }
    }
    
    // Update edge position based on connected nodes
    function positionEdge(edge) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode || !edge.element) return;
        
        // Calculate center points of nodes
        const sourceX = sourceNode.x + 30; // Half the node width
        const sourceY = sourceNode.y + 30;
        const targetX = targetNode.x + 30;
        const targetY = targetNode.y + 30;
        
        // Calculate distance and angle
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Adjust for node radius (so arrows don't go to center)
        const nodeRadius = 30;
        const startX = sourceX + nodeRadius * Math.cos(angle);
        const startY = sourceY + nodeRadius * Math.sin(angle);
        const shortenedLength = length - 2 * nodeRadius;
        
        // Position the edge
        edge.element.style.left = `${startX}px`;
        edge.element.style.top = `${startY}px`;
        edge.element.style.width = `${shortenedLength}px`;
        edge.element.style.transform = `rotate(${angle}rad)`;
    }
    
    // Update all edges connected to a node
    function updateConnectedEdges(nodeId) {
        edges.forEach(edge => {
            if (edge.source === nodeId || edge.target === nodeId) {
                positionEdge(edge);
            }
        });
    }
    
    // Calculate PageRank for all nodes
    function calculatePageRank() {
        const dampingFactor = parseFloat(dampingSlider.value);
        const iterations = parseInt(iterationsSlider.value);
        
        // Initialize PageRank values equally
        nodes.forEach(node => {
            node.rank = 1 / nodes.length;
        });
        
        // Create an adjacency matrix
        const outboundLinks = {};
        nodes.forEach(node => {
            outboundLinks[node.id] = [];
        });
        
        edges.forEach(edge => {
            outboundLinks[edge.source].push(edge.target);
        });
        
        // Store link contributions for analytics
        const linkContributions = {};
        
        // Iterative PageRank calculation
        for (let i = 0; i < iterations; i++) {
            const newRanks = {};
            
            // Initialize new ranks with the dampening factor
            nodes.forEach(node => {
                newRanks[node.id] = (1 - dampingFactor) / nodes.length;
            });
            
            // Calculate new ranks
            nodes.forEach(node => {
                const outbound = outboundLinks[node.id];
                if (outbound.length > 0) {
                    const contribution = dampingFactor * node.rank / outbound.length;
                    
                    // Store the final iteration's contributions
                    if (i === iterations - 1) {
                        outbound.forEach(targetId => {
                            const linkKey = `${node.id}-${targetId}`;
                            linkContributions[linkKey] = contribution;
                        });
                    }
                    
                    outbound.forEach(targetId => {
                        newRanks[targetId] += contribution;
                    });
                } else {
                    // Nodes with no outbound links distribute evenly
                    const contribution = dampingFactor * node.rank / nodes.length;
                    
                    // Store contributions for "dangling" nodes in final iteration
                    if (i === iterations - 1) {
                        nodes.forEach(n => {
                            const linkKey = `${node.id}-${n.id}`;
                            linkContributions[linkKey] = contribution;
                        });
                    }
                    
                    nodes.forEach(n => {
                        newRanks[n.id] += contribution;
                    });
                }
            });
            
            // Update ranks
            nodes.forEach(node => {
                node.rank = newRanks[node.id];
            });
        }
        
        // Store the link contributions for use in the table
        window.linkContributions = linkContributions;
        
        // Normalize ranks for display (sum should be 1)
        const sum = nodes.reduce((acc, node) => acc + node.rank, 0);
        nodes.forEach(node => {
            node.rank = node.rank / sum;
        });
        
        // Update UI
        updateRankDisplay();
        
        // Visualize link importance on the edges
        visualizeEdgeImportance();
    }
    
    // Visualize link importance by color and thickness
    function visualizeEdgeImportance() {
        if (!window.linkContributions || edges.length === 0) return;
        
        // Find max importance for scaling
        let maxImportance = 0;
        edges.forEach(edge => {
            const linkKey = `${edge.source}-${edge.target}`;
            const contribution = window.linkContributions[linkKey] || 0;
            maxImportance = Math.max(maxImportance, contribution);
        });
        
        // Define importance thresholds for styling
        const highThreshold = maxImportance * 0.7;
        const mediumThreshold = maxImportance * 0.3;
        
        // Apply styling to each edge based on importance
        edges.forEach(edge => {
            if (!edge.element) return;
            
            const linkKey = `${edge.source}-${edge.target}`;
            const importance = window.linkContributions[linkKey] || 0;
            
            // Reset previous styling
            edge.element.classList.remove('edge-high-importance', 'edge-medium-importance', 'edge-low-importance');
            
            // Apply appropriate styling class
            if (importance >= highThreshold) {
                edge.element.classList.add('edge-high-importance');
            } else if (importance >= mediumThreshold) {
                edge.element.classList.add('edge-medium-importance');
            } else {
                edge.element.classList.add('edge-low-importance');
            }
            
            // Add tooltips to show the importance value
            const tooltip = edge.element.querySelector('.edge-tooltip');
            if (tooltip) {
                tooltip.textContent = `Importance: ${importance.toFixed(4)}`;
            }
        });
    }
    
    // Update the rank display in the UI
    function updateRankDisplay() {
        // Sort nodes by rank for analytics table
        const sortedNodes = [...nodes].sort((a, b) => b.rank - a.rank);
        
        // Update node display
        nodes.forEach(node => {
            const rankDisplay = node.element.querySelector('.pagerank');
            rankDisplay.textContent = node.rank.toFixed(2);
            
            // Visual feedback - color nodes based on rank
            const hue = 200 + Math.round(node.rank * 160); // Blue to green gradient
            node.element.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
        });
        
        // Update analytics tables
        updateAnalyticsTable(sortedNodes);
        updateLinkRanksTable();
    }
    
    // Update the analytics table with sorted nodes data
    function updateAnalyticsTable(sortedNodes) {
        const tableBody = document.getElementById('ranking-table-body');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Count links for each node
        const incomingLinks = {};
        const outgoingLinks = {};
        
        // Initialize counts
        nodes.forEach(node => {
            incomingLinks[node.id] = 0;
            outgoingLinks[node.id] = 0;
        });
        
        // Count links
        edges.forEach(edge => {
            incomingLinks[edge.target] = (incomingLinks[edge.target] || 0) + 1;
            outgoingLinks[edge.source] = (outgoingLinks[edge.source] || 0) + 1;
        });
        
        // Add rows
        sortedNodes.forEach((node, index) => {
            const row = document.createElement('tr');
            
            // Add highest-rank class to the top ranked node
            if (index === 0) {
                row.classList.add('highest-rank');
            }
            
            // Create cells
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            
            const pageCell = document.createElement('td');
            pageCell.textContent = `Page ${node.id}`;
            pageCell.classList.add('page-id');
            
            const valueCell = document.createElement('td');
            valueCell.textContent = node.rank.toFixed(4);
            valueCell.classList.add('pagerank-value');
            
            const incomingCell = document.createElement('td');
            incomingCell.textContent = incomingLinks[node.id] || 0;
            incomingCell.classList.add('links');
            
            const outgoingCell = document.createElement('td');
            outgoingCell.textContent = outgoingLinks[node.id] || 0;
            outgoingCell.classList.add('links');
            
            // Add cells to the row
            row.appendChild(rankCell);
            row.appendChild(pageCell);
            row.appendChild(valueCell);
            row.appendChild(incomingCell);
            row.appendChild(outgoingCell);
            
            // Add row to table
            tableBody.appendChild(row);
        });
    }
    
    // Update the link ranks table
    function updateLinkRanksTable() {
        const tableBody = document.getElementById('links-table-body');
        if (!tableBody || !window.linkContributions) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Get all links with their contributions
        const linkData = [];
        
        edges.forEach(edge => {
            const linkKey = `${edge.source}-${edge.target}`;
            const contribution = window.linkContributions[linkKey] || 0;
            
            // Get source and target nodes
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            // Calculate link importance
            const importance = contribution;
            
            linkData.push({
                from: edge.source,
                to: edge.target,
                contribution: contribution,
                importance: importance,
                edge: edge, // Store edge reference for highlighting
                sourceRank: sourceNode ? sourceNode.rank : 0,
                targetRank: targetNode ? targetNode.rank : 0
            });
        });
        
        // Sort by importance (high to low)
        linkData.sort((a, b) => b.importance - a.importance);
        
        // Determine importance thresholds for coloring
        let maxImportance = 0;
        linkData.forEach(link => {
            maxImportance = Math.max(maxImportance, link.importance);
        });
        
        const highThreshold = maxImportance * 0.7;
        const mediumThreshold = maxImportance * 0.3;
        
        // Add rows
        linkData.forEach(link => {
            const row = document.createElement('tr');
            row.dataset.from = link.from;
            row.dataset.to = link.to;
            
            // Create cells
            const fromCell = document.createElement('td');
            fromCell.textContent = `Page ${link.from}`;
            fromCell.classList.add('node-from');
            
            const toCell = document.createElement('td');
            toCell.textContent = `Page ${link.to}`;
            toCell.classList.add('node-to');
            
            const importanceCell = document.createElement('td');
            importanceCell.textContent = link.importance.toFixed(4);
            
            // Color-code by importance
            if (link.importance >= highThreshold) {
                importanceCell.classList.add('link-importance-high');
                row.classList.add('link-high');
            } else if (link.importance >= mediumThreshold) {
                importanceCell.classList.add('link-importance-medium');
                row.classList.add('link-medium');
            } else {
                importanceCell.classList.add('link-importance-low');
                row.classList.add('link-low');
            }
            
            const contributionCell = document.createElement('td');
            const percentage = (link.contribution / nodes.find(n => n.id === link.to).rank) * 100;
            contributionCell.textContent = `${percentage.toFixed(2)}%`;
            
            // Add cells to the row
            row.appendChild(fromCell);
            row.appendChild(toCell);
            row.appendChild(importanceCell);
            row.appendChild(contributionCell);
            
            // Add hover effect to highlight the corresponding edge
            if (link.edge && link.edge.element) {
                const edgeElement = link.edge.element;
                
                row.addEventListener('mouseenter', () => {
                    // Store original edge classes to restore later
                    edgeElement.dataset.originalClasses = edgeElement.className;
                    // Add highlight class to edge
                    edgeElement.classList.add('edge-highlight');
                    // Also highlight source and target nodes
                    nodes.forEach(node => {
                        if (node.id === link.from || node.id === link.to) {
                            node.element.classList.add('node-highlight');
                        }
                    });
                });
                
                row.addEventListener('mouseleave', () => {
                    // Restore original classes
                    if (edgeElement.dataset.originalClasses) {
                        edgeElement.className = edgeElement.dataset.originalClasses;
                    }
                    // Remove highlight from nodes
                    nodes.forEach(node => {
                        node.element.classList.remove('node-highlight');
                    });
                });
            }
            
            // Add row to table
            tableBody.appendChild(row);
        });
    }
    
    // Reset the graph
    function resetGraph() {
        // Remove all nodes and edges
        nodes.forEach(node => {
            if (node.element && node.element.parentNode) {
                node.element.parentNode.removeChild(node.element);
            }
        });
        
        edges.forEach(edge => {
            if (edge.element && edge.element.parentNode) {
                edge.element.parentNode.removeChild(edge.element);
            }
        });
        
        // Reset state
        nodes = [];
        edges = [];
        nextNodeId = 1;
        
        // Reset display
        dampingSlider.value = 0.85;
        dampingValue.textContent = "0.85";
        iterationsSlider.value = 20;
        iterationsValue.textContent = "20";
        
        // Clear analytics table
        const tableBody = document.getElementById('ranking-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
        }
    }
    
    // Initialize with some nodes for demonstration
    function init() {
        // Add a notice about how to create links
        const notice = document.createElement('div');
        notice.style.position = 'absolute';
        notice.style.bottom = '10px';
        notice.style.left = '50%';
        notice.style.transform = 'translateX(-50%)';
        notice.style.backgroundColor = 'rgba(0,0,0,0.7)';
        notice.style.color = 'white';
        notice.style.padding = '10px 15px';
        notice.style.borderRadius = '5px';
        notice.style.zIndex = '100';
        notice.style.fontSize = '16px';
        notice.style.textAlign = 'center';
        notice.innerHTML = '<strong>Tip:</strong> Hold SHIFT and drag from one node to another to create a link';
        graphContainer.appendChild(notice);
        
        setTimeout(() => {
            notice.style.opacity = '0';
            notice.style.transition = 'opacity 1s ease-out';
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 1000);
        }, 5000);
        
        // Add a few nodes to start
        for (let i = 0; i < 6; i++) {
            createNode();
        }
        
        // Add some example connections
        setTimeout(() => {
            createEdge(1, 2);
            createEdge(3,2);
            createEdge(4,2);

            createEdge(3,6);
            createEdge(2,5);
            
            // Calculate initial PageRank
            calculatePageRank();
        }, 100);
    }
    
    // Initialize the demo
    init();
});