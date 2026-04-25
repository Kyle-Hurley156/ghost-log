import React, { useState, useMemo } from 'react';
import { Scale, Target, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp } from 'lucide-react';

// Compute 7-day simple moving average for smoothing daily fluctuations
function movingAverage(data, window = 7) {
  return data.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.weight, 0) / slice.length;
    return { date: point.date, weight: Math.round(avg * 10) / 10 };
  });
}

export const BodyWeightTracker = ({ statsHistory, goalWeight, onSetGoalWeight, requestPrompt }) => {
  const [expanded, setExpanded] = useState(true);
  const [timeRange, setTimeRange] = useState('1M');

  // Extract weight entries sorted by date
  const weightData = useMemo(() => {
    return statsHistory
      .filter(d => d.weight && d.weight > 0)
      .map(d => ({ date: d.date, weight: parseFloat(d.weight) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [statsHistory]);

  // Filter by time range
  const filteredData = useMemo(() => {
    if (weightData.length === 0) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeRange === '1W' ? 7 : timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : 365));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return weightData.filter(d => d.date >= cutoffStr);
  }, [weightData, timeRange]);

  const trendData = useMemo(() => movingAverage(filteredData), [filteredData]);

  // Stats calculations
  const stats = useMemo(() => {
    if (weightData.length === 0) return null;
    const current = weightData[weightData.length - 1].weight;
    const first = weightData[0].weight;

    // This week's change
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekEntries = weightData.filter(d => d.date >= weekStr);
    const weekChange = weekEntries.length >= 2
      ? current - weekEntries[0].weight
      : null;

    // This month's change
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthStr = monthAgo.toISOString().split('T')[0];
    const monthEntries = weightData.filter(d => d.date >= monthStr);
    const monthChange = monthEntries.length >= 2
      ? current - monthEntries[0].weight
      : null;

    // Total change
    const totalChange = weightData.length >= 2 ? current - first : null;

    // Distance to goal
    const toGoal = goalWeight ? current - goalWeight : null;

    return { current, weekChange, monthChange, totalChange, toGoal };
  }, [weightData, goalWeight]);

  if (weightData.length === 0) return null;

  // Chart rendering values
  const allWeights = filteredData.map(d => d.weight);
  if (goalWeight) allWeights.push(goalWeight);
  const chartMin = Math.min(...allWeights) - 1;
  const chartMax = Math.max(...allWeights) + 1;
  const chartRange = chartMax - chartMin || 1;

  // Raw data polyline
  const rawPoints = filteredData.map((d, i) => {
    const x = (i / (filteredData.length - 1 || 1)) * 100;
    const y = 100 - ((d.weight - chartMin) / chartRange) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  // Trend (moving average) polyline
  const trendPoints = trendData.map((d, i) => {
    const x = (i / (trendData.length - 1 || 1)) * 100;
    const y = 100 - ((d.weight - chartMin) / chartRange) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  // Goal line Y position
  const goalY = goalWeight
    ? 100 - ((goalWeight - chartMin) / chartRange) * 80 - 10
    : null;

  const formatChange = (val) => {
    if (val === null || val === undefined) return '--';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}`;
  };

  const ChangeIcon = ({ val }) => {
    if (val === null || val === undefined) return <Minus size={10} className="text-gray-600"/>;
    if (val > 0.1) return <TrendingUp size={10} className="text-red-400"/>;
    if (val < -0.1) return <TrendingDown size={10} className="text-green-400"/>;
    return <Minus size={10} className="text-gray-500"/>;
  };

  const changeColor = (val) => {
    if (val === null || val === undefined) return 'text-gray-600';
    // For cutting: loss is green, gain is red. We'll use neutral for now.
    if (Math.abs(val) < 0.1) return 'text-gray-500';
    return val > 0 ? 'text-red-400' : 'text-green-400';
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl mb-6 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Scale size={14} className="accent-text"/>
          <h3 className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.2em]">Body Weight</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white font-black text-sm">{stats?.current}<span className="text-gray-600 text-[10px] font-normal ml-0.5">kg</span></span>
          {expanded ? <ChevronUp size={14} className="text-gray-600"/> : <ChevronDown size={14} className="text-gray-600"/>}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Change stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-black/30 rounded-lg p-2 text-center border border-gray-800/30">
              <p className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">7 Days</p>
              <div className="flex items-center justify-center gap-1">
                <ChangeIcon val={stats?.weekChange}/>
                <span className={`text-xs font-black ${changeColor(stats?.weekChange)}`}>
                  {formatChange(stats?.weekChange)}
                </span>
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center border border-gray-800/30">
              <p className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">30 Days</p>
              <div className="flex items-center justify-center gap-1">
                <ChangeIcon val={stats?.monthChange}/>
                <span className={`text-xs font-black ${changeColor(stats?.monthChange)}`}>
                  {formatChange(stats?.monthChange)}
                </span>
              </div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center border border-gray-800/30">
              <p className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">
                {goalWeight ? 'To Goal' : 'Total'}
              </p>
              <div className="flex items-center justify-center gap-1">
                <ChangeIcon val={goalWeight ? stats?.toGoal : stats?.totalChange}/>
                <span className={`text-xs font-black ${changeColor(goalWeight ? stats?.toGoal : stats?.totalChange)}`}>
                  {formatChange(goalWeight ? stats?.toGoal : stats?.totalChange)}
                </span>
              </div>
            </div>
          </div>

          {/* Time range selector */}
          <div className="flex justify-center gap-4 text-[10px] font-bold text-gray-600 mb-3">
            {['1W', '1M', '3M', '1Y'].map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={`transition-colors ${timeRange === r ? 'text-white' : ''}`}>{r}</button>
            ))}
          </div>

          {/* Chart */}
          {filteredData.length >= 2 ? (
            <div className="relative h-[140px]">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[8px] text-gray-700 font-mono">
                <span>{chartMax.toFixed(0)}</span>
                <span>{((chartMax + chartMin) / 2).toFixed(0)}</span>
                <span>{chartMin.toFixed(0)}</span>
              </div>

              <div className="absolute left-9 right-0 top-0 bottom-0">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                  <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>

                  {/* Goal line */}
                  {goalY !== null && (
                    <>
                      <line x1="0" y1={goalY} x2="100" y2={goalY} stroke="#22c55e" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity="0.5"/>
                    </>
                  )}

                  {/* Raw data line (dim) */}
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="1" points={rawPoints} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>

                  {/* Trend line (bold) */}
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={trendPoints} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>

                  {/* Data points on trend line */}
                  {trendData.length <= 31 && trendData.map((d, i) => {
                    const x = (i / (trendData.length - 1 || 1)) * 100;
                    const y = 100 - ((d.weight - chartMin) / chartRange) * 80 - 10;
                    return <circle key={i} cx={x} cy={y} r="4" fill="var(--accent)" stroke="black" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>;
                  })}
                </svg>
              </div>

              {/* Goal label */}
              {goalWeight && (
                <div className="absolute right-0 text-[8px] text-green-400 font-bold" style={{ top: `${(goalY / 100) * 140 - 6}px` }}>
                  <Target size={8} className="inline mr-0.5"/>{goalWeight}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[100px] flex items-center justify-center">
              <p className="text-gray-600 text-xs">Log weight for 2+ days to see the trend</p>
            </div>
          )}

          {/* Legend + Goal setter */}
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-3 text-[8px] text-gray-600">
              <span className="flex items-center gap-1"><span className="w-3 h-[2px] rounded-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.3 }}/> Daily</span>
              <span className="flex items-center gap-1"><span className="w-3 h-[2.5px] rounded-full" style={{ backgroundColor: 'var(--accent)' }}/> 7d Avg</span>
              {goalWeight && <span className="flex items-center gap-1"><span className="w-3 h-[1px] border-t border-dashed border-green-500/50"/> Goal</span>}
            </div>
            <button
              onClick={() => {
                if (requestPrompt) {
                  requestPrompt('Goal weight (kg):', goalWeight ? String(goalWeight) : '', (input) => {
                    const val = parseFloat(input);
                    if (!isNaN(val) && val > 0) {
                      onSetGoalWeight(val);
                    } else if (input === '' || input === '0') {
                      onSetGoalWeight(null);
                    }
                  });
                }
              }}
              className="text-[9px] font-bold text-gray-600 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Target size={9}/> {goalWeight ? `${goalWeight}kg` : 'SET GOAL'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
