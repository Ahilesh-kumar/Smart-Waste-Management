{/* Bin Status Stack */ }
<div className={clsx("flex-1 p-6 rounded-3xl border flex flex-col", theme === 'dark' ? "bg-slate-800/40 border-slate-700" : "bg-white border-slate-200")}>
    <h3 className="text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2 opacity-70">
        <Database size={16} /> Bin Capacities
    </h3>
    <div className="flex-1 flex flex-col justify-between gap-4">
        {data.bins.map((bin) => (
            <div key={bin.id} className="space-y-2">
                <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="capitalize">{bin.name}</span>
                    <span className={bin.volume > 90 ? "text-red-500" : "opacity-60"}>{bin.volume}%</span>
                </div>
                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                    <div
                        className={clsx("h-full rounded-full transition-all duration-1000",
                            bin.volume > 90 ? "bg-red-500 animate-pulse" :
                                bin.type === 'bio' ? "bg-green-500" :
                                    bin.type === 'hazard' ? "bg-red-500" :
                                        bin.type === 'wet' ? "bg-blue-500" : "bg-amber-500"
                        )}
                        style={{ width: `${bin.volume}%` }}
                    />
                </div>
            </div>
        ))}
    </div>
</div>

        </div >


    {/* BOTTOM SECTION: ANALYTICS (Full Width) */ }
    < div className = "col-span-12 mt-4" >
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <BarChart2 className="text-blue-500" /> Real-Time Analytics
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
            {/* Animated Total Counter */}
            <div className={clsx("px-4 py-2 rounded-xl font-mono text-lg", theme === 'dark' ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-600")}>
              Total: <CountUp end={processingCounts.total} duration={0.8} preserveValue />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Category Distribution (Pie) with Drill-Down */}
            <ChartCard title="Category Distribution" theme={theme} onClick={() => setExpandedGraph({
              title: 'Category Distribution', graphId: 'pie', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Hazard', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={2} dataKey="value" label isAnimationActive animationDuration={800} animationEasing="ease-out">
                      <Cell fill="url(#gradientBio)" />
                      <Cell fill="url(#gradientHazard)" />
                      <Cell fill="url(#gradientWet)" />
                      <Cell fill="url(#gradientDry)" />
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              )
            })}>
              {processingCounts.total === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] w-full opacity-50">
                  <Activity className="animate-pulse text-blue-500 mb-2" size={32} />
                  <p className="text-xs font-mono uppercase tracking-widest">Waiting for Items...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie data={[{ name: 'Bio', value: processingCounts.bio }, { name: 'Hazard', value: processingCounts.hazard }, { name: 'Wet', value: processingCounts.wet }, { name: 'Dry', value: processingCounts.dry }]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" isAnimationActive animationDuration={600} animationEasing="ease-out">
                      <Cell fill="url(#gradientBio)" />
                      <Cell fill="url(#gradientHazard)" />
                      <Cell fill="url(#gradientWet)" />
                      <Cell fill="url(#gradientDry)" />
                    </Pie>
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 2. Items Processed (Bar) with Gradient */}
            <ChartCard title="Items by Category" theme={theme} onClick={() => setExpandedGraph({
              title: 'Items by Category', graphId: 'bar', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Hazard', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" isAnimationActive animationDuration={600}>
                      <Cell fill="url(#gradientBio)" />
                      <Cell fill="url(#gradientHazard)" />
                      <Cell fill="url(#gradientWet)" />
                      <Cell fill="url(#gradientDry)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            })}>
              {processingCounts.total === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] w-full opacity-50">
                  <BarChart2 className="animate-bounce text-blue-500 mb-2" size={32} />
                  <p className="text-xs font-mono uppercase tracking-widest">No Data Yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[{ name: 'Bio', count: processingCounts.bio }, { name: 'Hazard', count: processingCounts.hazard }, { name: 'Wet', count: processingCounts.wet }, { name: 'Dry', count: processingCounts.dry }]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Bar dataKey="count" isAnimationActive animationDuration={600} animationEasing="ease-out">
                      <Cell fill="url(#gradientBio)" />
                      <Cell fill="url(#gradientHazard)" />
                      <Cell fill="url(#gradientWet)" />
                      <Cell fill="url(#gradientDry)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* 3. Detections Trend (Line) with Glow */}
            <ChartCard title="Latest Trends" theme={theme} onClick={() => setExpandedGraph({
              title: 'Detections Trend', graphId: 'line', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="bio" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', filter: 'drop-shadow(0 0 4px #10b981)' }} isAnimationActive animationDuration={800} />
                    <Line type="monotone" dataKey="hazard" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', filter: 'drop-shadow(0 0 4px #ef4444)' }} isAnimationActive animationDuration={800} />
                    <Line type="monotone" dataKey="wet" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', filter: 'drop-shadow(0 0 4px #3b82f6)' }} isAnimationActive animationDuration={800} />
                    <Line type="monotone" dataKey="dry" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} isAnimationActive animationDuration={800} />
                  </LineChart>
                </ResponsiveContainer>
              )
            })}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Line type="monotone" dataKey="bio" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                  <Line type="monotone" dataKey="hazard" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                  <Line type="monotone" dataKey="wet" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                  <Line type="monotone" dataKey="dry" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive animationDuration={600} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 4. Cumulative Area Chart (Span 2) */}
            <ChartCard title="Cumulative Processing" theme={theme} className="lg:col-span-2" onClick={() => setExpandedGraph({
              title: 'Cumulative Processing', graphId: 'area', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="bio" stackId="1" fill="url(#gradientBio)" stroke="#10b981" isAnimationActive animationDuration={800} />
                    <Area type="monotone" dataKey="hazard" stackId="1" fill="url(#gradientHazard)" stroke="#ef4444" isAnimationActive animationDuration={800} />
                    <Area type="monotone" dataKey="wet" stackId="1" fill="url(#gradientWet)" stroke="#3b82f6" isAnimationActive animationDuration={800} />
                    <Area type="monotone" dataKey="dry" stackId="1" fill="url(#gradientDry)" stroke="#f59e0b" isAnimationActive animationDuration={800} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            })}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Area type="monotone" dataKey="bio" stackId="1" fill="url(#gradientBio)" fillOpacity={0.6} stroke="#10b981" isAnimationActive animationDuration={600} />
                  <Area type="monotone" dataKey="hazard" stackId="1" fill="url(#gradientHazard)" fillOpacity={0.6} stroke="#ef4444" isAnimationActive animationDuration={600} />
                  <Area type="monotone" dataKey="wet" stackId="1" fill="url(#gradientWet)" fillOpacity={0.6} stroke="#3b82f6" isAnimationActive animationDuration={600} />
                  <Area type="monotone" dataKey="dry" stackId="1" fill="url(#gradientDry)" fillOpacity={0.6} stroke="#f59e0b" isAnimationActive animationDuration={600} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 5. AI Confidence Scatter with Glow */}
            <ChartCard title="AI Confidence" theme={theme} onClick={() => setExpandedGraph({
              title: 'AI Confidence Distribution', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" name="Time" />
                    <YAxis dataKey="confidence" name="Confidence" domain={[0, 100]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={confidenceHistory} fill="#8b5cf6" isAnimationActive animationDuration={600}>
                      {confidenceHistory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.confidence > 80 ? '#10b981' : entry.confidence > 50 ? '#f59e0b' : '#ef4444'} style={{ filter: 'drop-shadow(0 0 3px rgba(139, 92, 246, 0.5))' }} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )
            })}>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" fontSize={10} />
                  <YAxis dataKey="confidence" domain={[0, 100]} fontSize={10} />
                  <Scatter data={confidenceHistory} isAnimationActive animationDuration={600}>
                    {confidenceHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.confidence > 80 ? '#10b981' : entry.confidence > 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 6. Hourly Stacked Bar Chart (NEW - Phase 3) */}
            <ChartCard title="Hourly Breakdown" theme={theme} className="lg:col-span-2" onClick={() => setExpandedGraph({
              title: 'Hourly Processing Breakdown', chart: (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="bio" stackId="a" fill="url(#gradientBio)" name="Bio-medical" isAnimationActive animationDuration={600} />
                    <Bar dataKey="hazard" stackId="a" fill="url(#gradientHazard)" name="Hazardous" isAnimationActive animationDuration={600} />
                    <Bar dataKey="wet" stackId="a" fill="url(#gradientWet)" name="Wet Waste" isAnimationActive animationDuration={600} />
                    <Bar dataKey="dry" stackId="a" fill="url(#gradientDry)" name="Dry Waste" isAnimationActive animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              )
            })}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="label" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="bio" stackId="a" fill="url(#gradientBio)" isAnimationActive animationDuration={600} />
                  <Bar dataKey="hazard" stackId="a" fill="url(#gradientHazard)" isAnimationActive animationDuration={600} />
                  <Bar dataKey="wet" stackId="a" fill="url(#gradientWet)" isAnimationActive animationDuration={600} />
                  <Bar dataKey="dry" stackId="a" fill="url(#gradientDry)" isAnimationActive animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 7. Comparison Mode (Current vs. Historical Average) */}
            <ChartCard title="Current vs. Average" theme={theme} onClick={() => setShowComparisonMode(true)}>
              <div className="flex flex-col gap-4">
                {(() => {
                  const avg = getHistoricalAverages();
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-70">Bio-medical</span>
                        <div className="flex gap-2 text-sm font-mono">
                          <span className="text-green-400">{processingCounts.bio}</span>
                          <span className="opacity-50">vs</span>
                          <span className="text-slate-400">{avg.bio}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-70">Hazardous</span>
                        <div className="flex gap-2 text-sm font-mono">
                          <span className="text-red-400">{processingCounts.hazard}</span>
                          <span className="opacity-50">vs</span>
                          <span className="text-slate-400">{avg.hazard}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-70">Wet Waste</span>
                        <div className="flex gap-2 text-sm font-mono">
                          <span className="text-blue-400">{processingCounts.wet}</span>
                          <span className="opacity-50">vs</span>
                          <span className="text-slate-400">{avg.wet}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-70">Dry Waste</span>
                        <div className="flex gap-2 text-sm font-mono">
                          <span className="text-amber-400">{processingCounts.dry}</span>
                          <span className="opacity-50">vs</span>
                          <span className="text-slate-400">{avg.dry}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold">TOTAL</span>
                        <div className="flex gap-2 text-lg font-mono font-bold">
                          <span className="text-white">{processingCounts.total}</span>
                          <span className="opacity-50">vs</span>
                          <span className="text-slate-400">{avg.total}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </ChartCard>
          </div>
        </div >
      </div >

    {/* Notifications overlay (if enabled) */ }
{
    notificationEnabled && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold animate-bounce hidden">
            Notifications Active
        </div>
    )
}

    </div >
  );
}

export default App;
