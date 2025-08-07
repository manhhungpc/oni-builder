import type { Position } from '@shared/src/interface';
import type { NodeData, NodeMetadata } from 'src/interface/building';
import type { SvelteMap } from 'svelte/reactivity';

// Helper functions for node keys
function nodeKey(node: Position): string {
    return `${node.x},${node.y}`;
}

function parseNodeKey(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

function addNode(connectionList: SvelteMap<string, NodeData>, node: Position): void {
    const key = nodeKey(node);
    if (!connectionList.has(key)) {
        connectionList.set(key, {
            connects: [],
            metadata: {},
        });
    }
}

function addConnection(
    connectionList: SvelteMap<string, NodeData>,
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

function removeNode(connectionList: SvelteMap<string, NodeData>, node: Position): void {
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
    connectionList: SvelteMap<string, NodeData>,
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
    connectionList: SvelteMap<string, NodeData>,
    node: Position,
    metadata: NodeMetadata
): void {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);
    if (nodeValue) {
        nodeValue.metadata = { ...nodeValue.metadata, ...metadata };
    }
}

// Get node metadata
function getNodeMetadata(
    connectionList: SvelteMap<string, NodeData>,
    node: Position
): NodeMetadata {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);
    return nodeValue?.metadata || {};
}

// Get all connections for a node
function getNodeConnections(
    connectionList: SvelteMap<string, NodeData>,
    node: Position
): Position[] {
    const key = nodeKey(node);
    const nodeValue = connectionList.get(key);

    if (!nodeValue) return [];

    return nodeValue.connects.map(parseNodeKey);
}

// Utility functions
function clearAdjacencyMap(connectionList: SvelteMap<string, NodeData>): void {
    connectionList.clear();
}

function getSize(connectionList: SvelteMap<string, NodeData>): number {
    return connectionList.size;
}

function hasNode(connectionList: SvelteMap<string, NodeData>, node: Position): boolean {
    return connectionList.has(nodeKey(node));
}

function hasConnection(
    connectionList: SvelteMap<string, NodeData>,
    from: Position,
    to: Position
): boolean {
    const fromKey = nodeKey(from);
    const toKey = nodeKey(to);

    const nodeValue = connectionList.get(fromKey);
    if (!nodeValue) return false;

    return nodeValue.connects.includes(toKey);
}

export {
    nodeKey,
    parseNodeKey,
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
