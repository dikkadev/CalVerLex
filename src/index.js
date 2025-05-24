// CalVerLex GitHub Action
// Generates unbounded CalVer tags with format: YYWWD + lexical suffix
// Example: 25216a (2025, week 21, day 6, suffix 'a')

(async() => {
  try {
    const inputs = {
      token: process.env.INPUT_GITHUB_TOKEN,
      repo: process.env.INPUT_REPOSITORY || process.env.GITHUB_REPOSITORY,
      yearFmt: process.env.INPUT_YEAR_FORMAT || '2',
      currentVersion: process.env.INPUT_CURRENT_VERSION || '',
    };

    // Validate required inputs
    if (!inputs.token) {
      throw new Error('GitHub token is required');
    }
    if (!inputs.repo) {
      throw new Error('Repository name is required');
    }

    function pad(num, size) {
      return num.toString().padStart(size, '0');
    }

    function logInfo(message) {
      console.log(`::notice::${message}`);
    }

    function logDebug(message) {
      console.log(`::debug::${message}`);
    }

    // Calculate date prefix (YYWWD format)
    function calculateDatePrefix() {
      const now = new Date();
      const yearFull = now.getFullYear();
      const year = inputs.yearFmt === '4' ? yearFull : yearFull % 100;
      
      // Calculate ISO week number
      const tmp = new Date(now.valueOf());
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
      const week = Math.ceil(((tmp - new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7);
      const day = (now.getUTCDay() || 7);
      
      const prefix = String(year) + pad(week, 2) + day;
      logDebug(`Date prefix calculated: ${prefix} (year: ${year}, week: ${week}, day: ${day})`);
      return prefix;
    }

    // Convert lexical suffix to number (a=1, b=2, ..., z=26, aa=27, ab=28, ...)
    function suffixToNumber(suffix) {
      let num = 0n;
      for (const c of suffix) {
        if (c < 'a' || c > 'z') {
          throw new Error(`Invalid suffix character: ${c}. Only lowercase letters a-z are allowed.`);
        }
        num = num * 26n + (BigInt(c.charCodeAt(0)) - 96n);
      }
      return num;
    }

    // Convert number to lexical suffix (1=a, 2=b, ..., 26=z, 27=aa, 28=ab, ...)
    function numberToSuffix(num) {
      let suffix = '';
      while (num > 0n) {
        num -= 1n;
        suffix = String.fromCharCode(Number(num % 26n) + 97) + suffix;
        num = num / 26n;
      }
      return suffix;
    }

    // Parse version into prefix and suffix
    function parseVersion(version) {
      const match = version.match(/^(\d{5,7})([a-z]+)$/);
      if (!match) {
        throw new Error(`Invalid version format: ${version}. Expected format: YYWWDx (e.g., 25216a)`);
      }
      return { prefix: match[1], suffix: match[2] };
    }

    const prefix = calculateDatePrefix();

    // If current version is provided, use it to calculate next
    if (inputs.currentVersion) {
      logInfo(`Using provided current version: ${inputs.currentVersion}`);
      
      try {
        const { prefix: currentPrefix, suffix: currentSuffix } = parseVersion(inputs.currentVersion);
        
        if (currentPrefix === prefix) {
          // Same date, increment suffix
          const currentNum = suffixToNumber(currentSuffix);
          const nextNum = currentNum + 1n;
          const nextSuffix = numberToSuffix(nextNum);
          const tag = prefix + nextSuffix;
          logInfo(`Incremented suffix from ${currentSuffix} to ${nextSuffix}`);
          console.log(`::set-output name=tag::${tag}`);
        } else {
          // Different date, start with 'a'
          const tag = prefix + 'a';
          logInfo(`Date changed from ${currentPrefix} to ${prefix}, starting with suffix 'a'`);
          console.log(`::set-output name=tag::${tag}`);
        }
      } catch (error) {
        throw new Error(`Failed to parse current version: ${error.message}`);
      }
      return;
    }

    // Fetch existing versions via GitHub API
    logInfo('Fetching existing tags from GitHub API...');
    const [owner, repoName] = inputs.repo.split('/');
    if (!owner || !repoName) {
      throw new Error(`Invalid repository format: ${inputs.repo}. Expected format: owner/repo`);
    }

    // Try different API endpoints for tags
    const endpoints = [
      `https://api.github.com/repos/${owner}/${repoName}/tags`,
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/tags`,
    ];

    let versions = [];
    let apiSuccess = false;

    for (const url of endpoints) {
      try {
        logDebug(`Trying API endpoint: ${url}`);
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${inputs.token}`,
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        if (res.ok) {
          const data = await res.json();
          // Handle different response formats
          if (Array.isArray(data)) {
            versions = data.map(item => ({
              name: item.name || item.ref?.replace('refs/tags/', '') || ''
            })).filter(item => item.name);
            apiSuccess = true;
            logInfo(`Successfully fetched ${versions.length} tags from ${url}`);
            break;
          }
        } else {
          logDebug(`API endpoint ${url} returned ${res.status}: ${res.statusText}`);
        }
      } catch (error) {
        logDebug(`Failed to fetch from ${url}: ${error.message}`);
      }
    }

    if (!apiSuccess) {
      logInfo('Could not fetch tags from API, starting with suffix "a"');
      console.log(`::set-output name=tag::${prefix}a`);
      return;
    }

    // Filter tags matching current date prefix + letters
    const regex = new RegExp(`^${prefix}([a-z]+)$`);
    let maxNum = 0n;
    let matchingTags = [];

    for (const v of versions) {
      const m = regex.exec(v.name);
      if (m) {
        matchingTags.push(v.name);
        try {
          const num = suffixToNumber(m[1]);
          if (num > maxNum) maxNum = num;
        } catch (error) {
          logDebug(`Skipping invalid tag ${v.name}: ${error.message}`);
        }
      }
    }

    logInfo(`Found ${matchingTags.length} matching tags for prefix ${prefix}: ${matchingTags.join(', ')}`);

    // Calculate next suffix
    const nextNum = maxNum + 1n;
    const suffix = numberToSuffix(nextNum);
    const tag = prefix + suffix;

    if (maxNum > 0n) {
      logInfo(`Incremented from ${numberToSuffix(maxNum)} to ${suffix}`);
    } else {
      logInfo(`No existing tags found for today, starting with ${suffix}`);
    }

    console.log(`::set-output name=tag::${tag}`);

  } catch (error) {
    console.error(`::error::CalVerLex failed: ${error.message}`);
    process.exit(1);
  }
})(); 