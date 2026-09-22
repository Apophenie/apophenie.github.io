#!/usr/bin/env python3
"""Liste et exporte les conversations locales t3code, en lecture seule."""
import argparse
import json
import sqlite3
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', type=Path, default=Path.home() / '.t3/userdata/state.sqlite')
    parser.add_argument('--project', help='Fragment du chemin du projet (liste uniquement)')
    parser.add_argument('--thread', help='Identifiant exact de la conversation à exporter')
    parser.add_argument('--output', type=Path, help='Nouveau dossier de sortie, obligatoire avec --thread')
    args = parser.parse_args()
    if bool(args.thread) != bool(args.output):
        parser.error('--thread et --output doivent être fournis ensemble')
    with sqlite3.connect(args.db.expanduser().resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        db.execute('BEGIN')  # Même instantané pour toutes les lectures, WAL compris.
        query = '''SELECT t.*, p.workspace_root, s.provider_name
                   FROM projection_threads t
                   JOIN projection_projects p USING (project_id)
                   LEFT JOIN projection_thread_sessions s USING (thread_id)'''
        if not args.thread:
            rows = db.execute(query + ' WHERE instr(p.workspace_root, ?) > 0 ORDER BY t.updated_at DESC',
                              (args.project or '',))
            for row in rows:
                print(json.dumps(dict(row), ensure_ascii=False))
            return
        row = db.execute(query + ' WHERE t.thread_id = ?', (args.thread,)).fetchone()
        if row is None:
            parser.error('Conversation introuvable dans cette base')
        data = {'thread': dict(row)}
        for key, table, order in [
            ('messages', 'projection_thread_messages', 'created_at, rowid'),
            ('activities', 'projection_thread_activities', 'created_at, sequence, rowid'),
            ('turns', 'projection_turns', 'requested_at, row_id'),
            ('plans', 'projection_thread_proposed_plans', 'created_at, rowid'),
            ('session', 'projection_thread_sessions', 'rowid'),
            ('runtime', 'provider_session_runtime', 'rowid'),
        ]:
            data[key] = [dict(r) for r in db.execute(
                f'SELECT * FROM {table} WHERE thread_id = ? ORDER BY {order}', (args.thread,))]
        data['events'] = [dict(r) for r in db.execute(
            'SELECT * FROM orchestration_events WHERE stream_id = ? ORDER BY sequence', (args.thread,))]
    args.output.mkdir(parents=True, exist_ok=False, mode=0o700)
    (args.output / 'session.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    transcript = [f"# {data['thread']['title']}", f"Conversation : `{args.thread}`"]
    for message in data['messages']:
        transcript.extend([f"## {message['created_at']} — {message['role']}", message['text']])
        if message.get('attachments_json'):
            transcript.append('Pièces jointes (métadonnées) : ' + message['attachments_json'])
    (args.output / 'conversation.md').write_text('\n\n'.join(transcript) + '\n')
    print(f"{len(data['messages'])} messages, {len(data['activities'])} activités, "
          f"{len(data['events'])} événements exportés dans {args.output}")


if __name__ == '__main__':
    main()
