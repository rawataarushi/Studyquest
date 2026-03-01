import { Router, Response } from 'express';
import axios from 'axios';
import { authenticate, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// LeetCode GraphQL endpoint
const LEETCODE_API = 'https://leetcode.com/graphql';
const CODEFORCES_API = 'https://codeforces.com/api';

// GET /api/integrations/leetcode/:username
router.get('/leetcode/:username', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum { difficulty count submissions }
          }
          userCalendar { streak totalActiveDays }
          profile { ranking reputation }
        }
        userContestRanking(username: $username) {
          attendedContestsCount rating globalRanking
        }
      }
    `;

    const response = await axios.post(LEETCODE_API, {
      query,
      variables: { username },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const user = response.data?.data?.matchedUser;
    if (!user) { res.status(404).json({ error: 'LeetCode user not found' }); return; }

    const stats = user.submitStats?.acSubmissionNum || [];
    const data = {
      username: user.username,
      solved: {
        easy: stats.find((s: {difficulty: string}) => s.difficulty === 'Easy')?.count || 0,
        medium: stats.find((s: {difficulty: string}) => s.difficulty === 'Medium')?.count || 0,
        hard: stats.find((s: {difficulty: string}) => s.difficulty === 'Hard')?.count || 0,
        total: stats.find((s: {difficulty: string}) => s.difficulty === 'All')?.count || 0,
      },
      streak: user.userCalendar?.streak || 0,
      ranking: user.profile?.ranking || 0,
      contestRating: response.data?.data?.userContestRanking?.rating || 0,
    };

    // Update user's leetcode info
    await prisma.user.update({
      where: { id: req.userId! },
      data: { leetcodeUsername: username },
    });

    res.json({ data });
  } catch (err) {
    console.error('LeetCode API error:', err);
    res.status(500).json({ error: 'Could not fetch LeetCode data' });
  }
});

// GET /api/integrations/codeforces/:handle
router.get('/codeforces/:handle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { handle } = req.params;

    const [userInfo, submissions] = await Promise.all([
      axios.get(`${CODEFORCES_API}/user.info?handles=${handle}`, { timeout: 10000 }),
      axios.get(`${CODEFORCES_API}/user.status?handle=${handle}&count=100`, { timeout: 10000 }),
    ]);

    if (userInfo.data.status !== 'OK') { res.status(404).json({ error: 'CF user not found' }); return; }

    const user = userInfo.data.result[0];
    const subs = submissions.data.result || [];
    const solved = new Set(subs.filter((s: {verdict: string; problem: {contestId: number; index: string}}) => s.verdict === 'OK')
      .map((s: {problem: {contestId: number; index: string}}) => `${s.problem.contestId}-${s.problem.index}`));

    const data = {
      handle: user.handle,
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      rank: user.rank || 'unrated',
      maxRank: user.maxRank || 'unrated',
      problemsSolved: solved.size,
      avatar: user.avatar,
    };

    await prisma.user.update({
      where: { id: req.userId! },
      data: { codeforcesHandle: handle },
    });

    res.json({ data });
  } catch (err) {
    console.error('Codeforces API error:', err);
    res.status(500).json({ error: 'Could not fetch Codeforces data' });
  }
});

// GET /api/integrations/my-stats
router.get('/my-stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    const results: Record<string, unknown> = {};

    if (user.leetcodeUsername) {
      try {
        const lc = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/integrations/leetcode/${user.leetcodeUsername}`,
          { headers: { Authorization: `Bearer ${req.headers.authorization?.split(' ')[1]}` } });
        results.leetcode = lc.data.data;
      } catch { results.leetcode = null; }
    }

    if (user.codeforcesHandle) {
      try {
        const cf = await axios.get(`http://localhost:${process.env.PORT || 5000}/api/integrations/codeforces/${user.codeforcesHandle}`,
          { headers: { Authorization: `Bearer ${req.headers.authorization?.split(' ')[1]}` } });
        results.codeforces = cf.data.data;
      } catch { results.codeforces = null; }
    }

    res.json({ stats: results });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
