import type { Position } from '@shared/src/interface';
import type { SvelteMap } from 'svelte/reactivity';

// Helper functions for node keys
function nodeKey(node: Position): string {
    return `${node.x},${node.y}`;
}

function parseNodeKey(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

// Add a new node
function addNode(connectionList: SvelteMap<string, string[]>, node: Position): void {
    const key = nodeKey(node);
    if (!connectionList.has(key)) {
        connectionList.set(key, []);
    }
}

// Connect 2 nodes
function addConnection(
    connectionList: SvelteMap<string, string[]>,
    node1: Position,
    node2: Position
): void {
    const key1 = nodeKey(node1);
    const key2 = nodeKey(node2);

    addNode(connectionList, node1);
    addNode(connectionList, node2);

    const connections1 = connectionList.get(key1);
    if (connections1 && !connections1.includes(key2)) {
        connections1.push(key2);
    }

    const connections2 = connectionList.get(key2);
    if (connections2 && !connections2.includes(key1)) {
        connections2.push(key1);
    }
}

// Delete a node and all its connections
function removeNode(connectionList: SvelteMap<string, string[]>, node: Position): void {
    const key = nodeKey(node);

    connectionList.forEach((connections, nodeKey) => {
        const filteredConnections = connections.filter((connectionKey) => connectionKey !== key);
        connectionList.set(nodeKey, filteredConnections);
    });

    connectionList.delete(key);
}

// Delete a connection between two nodes
function removeConnection(
    connectionList: SvelteMap<string, string[]>,
    node1: Position,
    node2: Position
): boolean {
    const key1 = nodeKey(node1);
    const key2 = nodeKey(node2);

    let removed = false;

    const connections1 = connectionList.get(key1);
    if (connections1) {
        const initialLength1 = connections1.length;
        const filteredConnections1 = connections1.filter((connectionKey) => connectionKey !== key2);
        if (filteredConnections1.length !== initialLength1) {
            connectionList.set(key1, filteredConnections1);
            removed = true;
        }
    }

    const connections2 = connectionList.get(key2);
    if (connections2) {
        const initialLength2 = connections2.length;
        const filteredConnections2 = connections2.filter((connectionKey) => connectionKey !== key1);
        if (filteredConnections2.length !== initialLength2) {
            connectionList.set(key2, filteredConnections2);
            removed = true;
        }
    }

    return removed;
}

// Utility functions
function clearAdjacencyMap(connectionList: SvelteMap<string, string[]>): void {
    connectionList.clear();
}

function getSize(connectionList: SvelteMap<string, string[]>): number {
    return connectionList.size;
}

function hasNode(connectionList: SvelteMap<string, string[]>, node: Position): boolean {
    return connectionList.has(nodeKey(node));
}

function hasConnection(
    connectionList: SvelteMap<string, string[]>,
    from: Position,
    to: Position
): boolean {
    const fromKey = nodeKey(from);
    const toKey = nodeKey(to);

    const connections = connectionList.get(fromKey);
    if (!connections) return false;

    return connections.includes(toKey);
}

// Export all functions at the bottom
export {
    nodeKey,
    parseNodeKey,
    addNode,
    addConnection,
    removeNode,
    removeConnection,
    clearAdjacencyMap,
    getSize,
    hasNode,
    hasConnection,
};
