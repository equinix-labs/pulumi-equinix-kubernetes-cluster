from pathlib import Path


def get_project_root():
    """
    get_project_root() return `python` folder path
    and treat it as the root
    """
    return str(Path(__file__).parent.parent)


def get_file_content(file_path):
    with open(file_path, "r", encoding="UTF-8") as file:
        return file.read()
