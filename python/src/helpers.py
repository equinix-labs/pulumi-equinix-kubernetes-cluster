from pathlib import Path


def get_project_root():
    return str(Path(__file__).parent.parent)


def get_file_content(file_path):
    with open(file_path, "r", encoding="UTF-8") as file:
        return file.read()
