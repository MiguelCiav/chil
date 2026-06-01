#!/bin/bash
# scripts/install-skill.sh - Automatically downloads and installs Agent Skills
# Compatible with both single-file (.md/.json) and folder-based skills.

set -e

# Target skills directory
SKILLS_DIR=".agent/skills"
mkdir -p "$SKILLS_DIR"

if [ -z "$1" ]; then
    echo "Error: Missing URL argument."
    echo "Usage: ./scripts/install-skill.sh <GitHub-Folder-Or-File-URL>"
    echo ""
    echo "Examples:"
    echo "  - Single File: ./scripts/install-skill.sh https://github.com/vercel-labs/skills/blob/main/skills/react-best-practices.md"
    echo "  - Folder Skill: ./scripts/install-skill.sh https://github.com/phuryn/pm-skills/tree/main/pm-execution/skills/user-stories"
    exit 1
fi

URL="$1"

# 1. Handle Single File Skills (.md / .json)
if [[ "$URL" =~ \.md$ || "$URL" =~ \.json$ ]]; then
    FILENAME=$(basename "$URL")
    RAW_URL="$URL"
    
    # Convert standard github.com URL to raw.githubusercontent.com if needed
    if [[ "$URL" =~ github.com ]]; then
        RAW_URL=$(echo "$URL" | sed 's/github.com/raw.githubusercontent.com/' | sed 's/\/blob\//\//')
    fi
    
    echo "Downloading file skill from $RAW_URL..."
    curl -sSL "$RAW_URL" -o "$SKILLS_DIR/$FILENAME"
    echo "✓ Successfully installed file skill: $SKILLS_DIR/$FILENAME"

# 2. Handle Folder-Based Skills
else
    echo "Analyzing folder URL: $URL..."
    
    # Parse Owner, Repo, Branch, and Subpath from standard GitHub tree URL
    # e.g., https://github.com/phuryn/pm-skills/tree/main/pm-execution/skills/user-stories
    if [[ "$URL" =~ github.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$ ]]; then
        OWNER="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]}"
        BRANCH="${BASH_REMATCH[3]}"
        SUBPATH="${BASH_REMATCH[4]}"
        
        TEMP_DIR=$(mktemp -d)
        echo "Creating temporary clone in $TEMP_DIR..."
        
        # Perform a shallow clone with sparse checkout to fetch ONLY the target folder without bloating local disk
        git clone --depth 1 --filter=blob:none --no-checkout "https://github.com/$OWNER/$REPO.git" "$TEMP_DIR"
        cd "$TEMP_DIR"
        git sparse-checkout set "$SUBPATH"
        git checkout
        cd - > /dev/null
        
        FOLDER_NAME=$(basename "$SUBPATH")
        DEST_PATH="$SKILLS_DIR/$FOLDER_NAME"
        
        # Remove existing destination folder if it exists
        if [ -d "$DEST_PATH" ]; then
            rm -rf "$DEST_PATH"
        fi
        
        # Move the folder into the project agent skills directory
        mv "$TEMP_DIR/$SUBPATH" "$SKILLS_DIR/"
        rm -rf "$TEMP_DIR"
        
        echo "✓ Successfully installed folder skill: $DEST_PATH"
        echo "Structure inside:"
        ls -R "$DEST_PATH"
    else
        echo "Error: Could not parse GitHub URL structure."
        echo "Ensure the URL is a standard GitHub tree URL like:"
        echo "  https://github.com/phuryn/pm-skills/tree/main/pm-execution/skills/user-stories"
        exit 1
    fi
fi
