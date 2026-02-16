import type { Position } from 'src/interface/building';
import type { ConduitNode, GridNodeData } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';

// Helper functions for node keys
function nodeKey(node: Position): string {
    return `${node.x},${node.y}`;
}

function parseNodeKey(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

function addNode(connectionList: SvelteMap<string, ConduitNode>, node: Position): void {
    const key = nodeKey(node);
    if (!connectionList.has(key)) {
        connectionList.set(key, {
            connects: [],
            metadata: {},
        });
    }
}

function addConnection(
    connectionList: SvelteMap<string, ConduitNode>,
    node1: Position,
    node2: Position
): void {
    const key1 = nodeKey(node1);
    const key2 = nodeKey(node2);

    // Ensure both nodes exist
    addNode(connectionList, node1);
    addNode(connectionList, node2);

    const nodeValue1 = connectionList.get(key1);
    const nodeValue2 = connectionList.get(key2);

    if (nodeValue1 && !nodeValue1.connects.includes(key2)) {
        nodeValue1.connects.push(key2);
    }

    if (nodeValue2 && !nodeValue2.connects.includes(key1)) {
        nodeValue2.connects.push(key1);
    }
}

function removeNode(connectionList: SvelteMap<string, ConduitNode>, node: Position): void {
    const keyToRemove = nodeKey(node);

    // Remove references to this node from all other nodes
    connectionList.forEach((nodeValue) => {
        const index = nodeValue.connects.indexOf(keyToRemove);
        if (index !== -1) {
            nodeValue.connects.splice(index, 1);
        }
    });

    // Remove the node itself
    connectionList.delete(keyToRemove);
}

function removeConnection(
    connectionList: SvelteMap<string, ConduitNode>,
    node1: Position,
    node2: Position
): boolean {
    const key1 = nodeKey(node1);
    const key2 = nodeKey(node2);

    let removed = false;

    const nodeValue1 = connectionList.get(key1);
    if (nodeValue1) {
        const index1 = nodeValue1.connects.indexOf(key2);
        if (index1 !== -1) {
            nodeValue1.connects.splice(index1, 1);
            removed = true;
        }
    }

    const nodeValue2 = connectionList.get(key2);
    if (nodeValue2) {
        const index2 = nodeValue2.connects.indexOf(key1);
        if (index2 !== -1) {
            nodeValue2.connects.splice(index2, 1);
            removed = true;
        }
    }

    return removed;
}

function updateNodeMetadata(
    connectionList: SvelteMap<string, ConduitNode>,
    node: Position,
    metadata: GridNodeData
): void {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);
    if (nodeValue) {
        nodeValue.metadata = { ...nodeValue.metadata, ...metadata };
    }
}

// Get node metadata
function getNodeMetadata(
    connectionList: SvelteMap<string, ConduitNode>,
    node: Position
): GridNodeData {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);
    return nodeValue?.metadata || {};
}

// Get all connections for a node
function getNodeConnections(
    connectionList: SvelteMap<string, ConduitNode>,
    node: Position
): Position[] {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);

    if (!nodeValue) return [];

    return nodeValue.connects.map(parseNodeKey);
}

// Utility functions
function clearAdjacencyMap(connectionList: SvelteMap<string, ConduitNode>): void {
    connectionList.clear();
}

function getSize(connectionList: SvelteMap<string, ConduitNode>): number {
    return connectionList.size;
}

function hasNode(connectionList: SvelteMap<string, ConduitNode>, node: Position): boolean {
    return connectionList.has(nodeKey(node));
}

function hasConnection(
    connectionList: SvelteMap<string, ConduitNode>,
    from: Position,
    to: Position
): boolean {
    const fromKey = nodeKey(from);
    const toKey = nodeKey(to);

    const nodeValue = connectionList.get(fromKey);
    if (!nodeValue) return false;

    return nodeValue.connects.includes(toKey);
}

/**
 * BFS spread from seed positions through connected conduit nodes.
 * Returns all reachable positions (seeds + connected conduits).
 */
function bfs(
    startPosition: string,
    connectionList: SvelteMap<string, ConduitNode>
): Set<string> {
    const network = new Set<string>();
    const queue: string[] = [startPosition];
    network.add(startPosition);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const node = connectionList.get(current);
        if (!node) continue;

        for (const neighbor of node.connects) {
            if (network.has(neighbor)) continue;
            if (!connectionList.has(neighbor)) continue;
            network.add(neighbor);
            queue.push(neighbor);
        }
    }

    return network;
}

export {
    nodeKey,
    parseNodeKey,
    bfs,
    addNode,
    addConnection,
    removeNode,
    removeConnection,
    updateNodeMetadata,
    getNodeMetadata,
    getNodeConnections,
    clearAdjacencyMap,
    getSize,
    hasNode,
    hasConnection,
};
