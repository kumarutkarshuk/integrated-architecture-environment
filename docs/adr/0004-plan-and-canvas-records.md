# Store Plan and canvas records separately

A generate AI Generation keeps two payloads: a Plan (LLM components and connections) and `result` (tldraw records). Apply always writes the stored records so the User gets the Preview they saw. The Plan is for later rebuild and quality work when layout code changes. Screenshots are not stored; records already replay that Preview.
