import db from '../lib/db';

console.log('Database initialized successfully!');
console.log('Tables created: workspaces, nodes, edges, workspace_shares');

db.close();

