import re
import csv
import sys

def parse_input(input_text):
    lines = input_text.strip().split('\n')
    arguments = []
    stack = []
    current_text = ""
    id_map = {}
    
    for line in lines:
        match = re.match(r'(\s*)(\d+(?:\.\d+)*)\.\s*(Pro|Con)?:?\s*(.*)', line)
        if match:
            if current_text:
                stack[-1]['text'] += " " + current_text.strip()
                current_text = ""
            
            indent, id_str, sentiment, text = match.groups()
            level = len(indent) // 2
            
            while len(stack) > level:
                stack.pop()
            
            parent_id = stack[-1]['id'] if stack else None
            
            # Remove footnote markers and strip leading/trailing spaces
            text = re.sub(r'\[\d+\]', '', text).strip()
            
            arg = {
                'id': len(arguments) + 1,
                'text': text,
                'parent_id': parent_id,
                'weight': 5,
                'sentiment': 1 if sentiment != 'Con' else -1,
                'original_id': id_str
            }
            arguments.append(arg)
            stack.append(arg)
            id_map[id_str] = arg
        else:
            current_text += " " + line.strip()
    
    # Add any remaining text to the last argument
    if current_text and stack:
        stack[-1]['text'] += " " + current_text.strip()
    # Process "-> See X.X.X." references
    for arg in arguments:
        if arg['text'].strip().startswith("-> See "):
            ref_id = arg['text'].split()[2].rstrip('.')
            if ref_id in id_map:
                referenced_arg = id_map[ref_id]
                arg['text'] = referenced_arg["text"]
                
                # Function to recursively copy children
                def copy_children(parent_arg, original_parent_id):
                    children_to_copy = [a for a in arguments if a['parent_id'] == original_parent_id]
                    for child in children_to_copy:
                        new_child = child.copy()
                        new_child['id'] = len(arguments) + 1
                        new_child['parent_id'] = parent_arg['id']
                        new_child['text'] = child["text"]
                        arguments.append(new_child)
                        # Recursively copy children of this child
                        copy_children(new_child, child['id'])
                
                # Start copying from the referenced argument
                copy_children(arg, referenced_arg['id'])
    
    return arguments

def write_csv(arguments, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['id', 'text', 'parent_id', 'weight', 'sentiment']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames, quoting=csv.QUOTE_NONNUMERIC)
        writer.writeheader()
        for arg in arguments:
            row = {k: v for k, v in arg.items() if k in fieldnames}
            if row['parent_id'] is None:
                row['parent_id'] = ''
            # Ensure text doesn't begin with a space
            row['text'] = row['text'].strip()
            writer.writerow(row)

def main():
    input_file = 'input.txt'
    output_file = 'output_language.csv'

    
    try:
        with open(input_file, 'r', encoding='utf-8') as file:
            input_text = file.read()
    except UnicodeDecodeError:
        print("UTF-8 decoding failed. Trying with system default encoding...")
        with open(input_file, 'r') as file:
            input_text = file.read()
    
    arguments = parse_input(input_text)
    write_csv(arguments, output_file)
    print(f"Conversion complete. Output written to {output_file}")

if __name__ == "__main__":
    main()