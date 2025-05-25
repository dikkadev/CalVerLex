# CalVerLex GitHub Action

Generate unbounded CalVer (Calendar Versioning) tags with lexical suffixes for unlimited same-day releases.

## Versioning Scheme Specification

### Format: `YYWWD` + `suffix`

CalVerLex uses a date-based prefix followed by a lexical suffix:

- **YY/YYYY**: 2-digit or 4-digit year (configurable)
- **WW**: Zero-padded ISO week number (01-53) 
- **D**: Day of week (1=Monday, 7=Sunday)
- **suffix**: Lexical sequence (a, b, c, ..., z, aa, ab, ..., zz, aaa, ...)

### Examples

| Date | Week | Day | 2-digit Year | 4-digit Year | First Release | Second Release | 27th Release |
|------|------|-----|--------------|--------------|---------------|----------------|--------------|
| 2025-01-20 | 4 | 1 (Mon) | `25041a` | `2025041a` | `25041a` | `25041b` | `25041aa` |
| 2025-01-21 | 4 | 2 (Tue) | `25042a` | `2025042a` | `25042a` | `25042b` | `25042aa` |
| 2025-12-29 | 1 | 1 (Mon) | `25011a` | `2025011a` | `25011a` | `25011b` | `25011aa` |

### Lexical Suffix Sequence

The suffix follows Excel-style column naming:

```
a, b, c, ..., x, y, z,           (1-26)
aa, ab, ac, ..., ax, ay, az,     (27-52)
ba, bb, bc, ..., bx, by, bz,     (53-78)
...
za, zb, zc, ..., zx, zy, zz,     (677-702)
aaa, aab, aac, ...               (703+)
```

This provides unlimited same-day releases without numeric conflicts.

### ISO Week Calculation

CalVerLex uses ISO 8601 week numbering:
- Week 1 contains January 4th
- Weeks run Monday to Sunday  
- Week numbers are zero-padded (01, 02, ..., 53)

## Usage

### Basic Usage

```yaml
- name: Generate CalVerLex tag
  id: calverlex
  uses: dikkadev/CalVerLex@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Use the generated tag
  run: echo "New tag: ${{ steps.calverlex.outputs.tag }}"
```

### Configuration Options

```yaml
- name: Generate CalVerLex tag
  uses: dikkadev/CalVerLex@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    repository: ${{ github.repository }}     # Optional: defaults to current repo
    year_format: '4'                         # Optional: '2' or '4' (default: '2')
    current_version: '25041b'                # Optional: current latest version to increment from
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `github_token` | GitHub token for API access | Yes | |
| `repository` | Repository in format `owner/repo` | No | `${{ github.repository }}` |
| `year_format` | Year digits: `2` or `4` | No | `2` |
| `current_version` | Current latest version (format: `YYWWDx`) to increment from instead of API lookup | No | |

### Outputs

| Output | Description |
|--------|-------------|
| `tag` | Generated CalVerLex tag (e.g., `25041c`) |

## Examples

### Continuous Integration

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate version tag
        id: version
        uses: dikkadev/CalVerLex@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Create release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ steps.version.outputs.tag }}
          release_name: Release ${{ steps.version.outputs.tag }}
```

### Manual Override

When you need to specify the current version manually (useful for testing or when API access is limited):

```yaml
- name: Generate next version from z to aa
  uses: dikkadev/CalVerLex@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    current_version: '25041z'  # Will generate 25041aa (same day) or 25042a (different day)
```

### 4-Digit Year Format

For long-term projects that need year clarity:

```yaml
- name: Generate version with full year
  uses: dikkadev/CalVerLex@main
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    year_format: '4'
```

## Edge Cases & Behavior

### Same Day Multiple Releases

Multiple releases on the same day increment the suffix:
- First: `25041a`
- Second: `25041b` 
- 26th: `25041z`
- 27th: `25041aa`
- 52nd: `25041az`
- 53rd: `25041ba`

### Date Changes

When the date changes, the suffix resets to 'a':
- Last release of day: `25041z`
- First release next day: `25042a`

### API Fallback

If GitHub API is unavailable, the action falls back to suffix 'a':
- No API access: generates `25041a`
- Graceful degradation ensures the action always succeeds

### Year Boundaries

CalVerLex handles year transitions correctly using ISO week numbers:
- December dates can be part of the next year's week 1
- January dates can be part of the previous year's last week
- The action always uses the ISO week year, not calendar year

### Invalid Tags

The action ignores non-CalVerLex tags in the repository:
- Ignores: `v1.0.0`, `release-2024`, `25041` (no suffix)
- Processes: `25041a`, `25041bb`, `2025041z`

## Error Handling

The action provides clear error messages for common issues:

- **Missing GitHub token**: `GitHub token is required`
- **Invalid repository format**: `Invalid repository format: xyz. Expected format: owner/repo`
- **Invalid current_version**: `Invalid version format: abc. Expected format: YYWWDx (e.g., 25216a)`
- **API errors**: Logs debug information and falls back gracefully

## Parsing

### Known Year Format

If you know whether the tag uses 2-digit or 4-digit year format, parsing is trivial from front to back.

### Unknown Year Format

When the year format is unknown, parsing from the back is not much more complex:

```pseudo
function parseCalVerLex(tag):
    i = tag.length - 1
    suffix = ""
    
    // Iterate from back collecting all letters (suffix)
    while i >= 0 and tag[i] is letter:
        suffix = tag[i] + suffix
        i = i - 1
    
    // Take single digit (day)
    day = tag[i]
    i = i - 1
    
    // Take 2 digits (week)
    week = tag[i-1] + tag[i]
    i = i - 2
    
    // Remaining digits are year
    year = tag[0..i]
    
    return {year, week, day, suffix}
```

The lexical suffix always consists of lowercase letters `[a-z]+`, making it easy to identify the boundary between date and suffix components.

## Testing

### Local Testing

Test the action locally before pushing:

```bash
# Set up required environment variables
export GITHUB_OUTPUT=$(mktemp)  # Required for local testing
export INPUT_GITHUB_TOKEN="your_token"
export INPUT_REPOSITORY="owner/repo"

# Basic test
node src/index.js

# Test with current version override
export INPUT_CURRENT_VERSION="25041a"
node src/index.js

# Test with 4-digit year
export INPUT_YEAR_FORMAT="4"
node src/index.js

# Clean up
rm -f "$GITHUB_OUTPUT"
```

### Automated Testing Script

Use the provided testing script for comprehensive local validation:

```bash
# Run all local tests with proper environment setup
./test/test-local.sh
```

### Unit Tests

Run comprehensive unit tests that validate the core mathematical functions:

```bash
node test/unit-tests.js
```

### GitHub Actions Testing

The action includes comprehensive integration tests that run on every push:

- **Basic functionality** - Tests default behavior with today's date
- **Current version override** - Tests manual version specification and suffix increment
- **4-digit year format** - Tests year format options with full date validation
- **Error handling** - Tests invalid input handling
- **Sequential runs** - Tests multiple runs with proper `a → b` incrementing
- **Suffix boundary** - Tests critical `z → aa` boundary condition

These tests run automatically and validate both the action's output format and correctness of the generated tags.

## Contributing

1. Fork the repository: https://github.com/dikkadev/CalVerLex
2. Run tests locally: `node test/unit-tests.js && ./test/test-local.sh`
3. Follow conventional commits
4. Update documentation for any API changes
5. Submit pull request
