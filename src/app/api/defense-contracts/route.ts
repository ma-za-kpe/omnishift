/**
 * Defense Contracts API - USASpending.gov Integration
 * Tracks government defense spending that impacts defense stocks
 * NO MOCK DATA - Only real federal spending data
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const minAmount = parseInt(searchParams.get('minAmount') || '1000000'); // $1M minimum
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    console.log(`🏛️ Fetching defense contracts from USASpending.gov for last ${days} days`);

    const contracts = await fetchDefenseContracts(days, minAmount, limit);

    return NextResponse.json({
      success: true,
      dataSource: 'USASPENDING_GOV_REAL',
      timeframe: `${days}d`,
      minAmount: `$${minAmount.toLocaleString()}`,
      contracts,
      count: contracts.length,
      totalValue: contracts.reduce((sum, contract) => sum + (contract.amount || 0), 0),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Defense contracts fetch failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch defense contracts',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Fetch defense contracts from USASpending.gov API
 */
async function fetchDefenseContracts(days: number, minAmount: number, limit: number) {
  try {
    // USASpending.gov API is free and doesn't require API key
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const requestBody = {
      filters: {
        time_period: [
          {
            start_date: startDate,
            end_date: endDate
          }
        ],
        award_type_codes: ["A", "B", "C", "D"], // Contract types
        agencies: [
          {
            type: "toptier",
            tier: "toptier",
            name: "Department of Defense"
          }
        ],
        award_amounts: [
          {
            lower_bound: minAmount
          }
        ]
      },
      fields: [
        "Award ID",
        "Recipient Name", 
        "Award Amount",
        "Description",
        "Start Date",
        "End Date",
        "Awarding Agency",
        "Awarding Sub Agency",
        "Award Type",
        "Contract Award Type"
      ],
      page: 1,
      limit: limit,
      sort: "Award Amount",
      order: "desc"
    };

    console.log(`📊 Querying USASpending.gov for defense contracts > $${minAmount.toLocaleString()}`);

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Trading-System/1.0 (Defense-Contract-Monitor)'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`USASpending.gov API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      console.log('No defense contracts found in the specified timeframe');
      return [];
    }

    console.log(`✅ Found ${data.results.length} defense contracts from USASpending.gov`);

    // Transform and enrich the contract data
    return data.results.map((award: any) => {
      const contract = {
        id: award.generated_internal_id || award.Award_ID,
        awardId: award.Award_ID,
        recipient: award.Recipient_Name,
        amount: parseFloat(award.Award_Amount) || 0,
        description: award.Description || '',
        startDate: award.Start_Date,
        endDate: award.End_Date,
        awardingAgency: award.Awarding_Agency,
        awardingSubAgency: award.Awarding_Sub_Agency,
        awardType: award.Award_Type,
        contractType: award.Contract_Award_Type,
        source: 'USASpending.gov',
        impactedStocks: identifyImpactedStocks(award.Recipient_Name, award.Description),
        marketImpact: assessContractMarketImpact(award.Award_Amount, award.Description),
        timestamp: new Date().toISOString()
      };

      return contract;
    });

  } catch (error) {
    console.error('Error fetching from USASpending.gov:', error);
    throw error;
  }
}

/**
 * Identify publicly traded stocks that might be impacted by the contract
 */
function identifyImpactedStocks(recipient: string, description: string): Array<{
  symbol: string;
  company: string;
  confidence: number;
  reasoning: string;
}> {
  const impactedStocks: Array<{
    symbol: string;
    company: string;
    confidence: number;
    reasoning: string;
  }> = [];

  const contractText = `${recipient} ${description}`.toLowerCase();

  // Map major defense contractors to their stock symbols
  const defenseContractors = [
    {
      symbol: 'LMT',
      company: 'Lockheed Martin',
      keywords: ['lockheed', 'martin', 'lmt'],
      specialties: ['missile', 'aerospace', 'defense systems', 'f-35', 'aegis']
    },
    {
      symbol: 'RTX',
      company: 'Raytheon Technologies',
      keywords: ['raytheon', 'rtx', 'technologies'],
      specialties: ['missile defense', 'radar', 'patriot', 'tomahawk']
    },
    {
      symbol: 'NOC',
      company: 'Northrop Grumman',
      keywords: ['northrop', 'grumman', 'noc'],
      specialties: ['aerospace', 'cyber', 'b-21', 'stealth']
    },
    {
      symbol: 'BA',
      company: 'Boeing',
      keywords: ['boeing', 'ba'],
      specialties: ['aircraft', 'helicopter', 'apache', 'chinook']
    },
    {
      symbol: 'GD',
      company: 'General Dynamics',
      keywords: ['general dynamics', 'gd'],
      specialties: ['submarines', 'tanks', 'combat systems']
    },
    {
      symbol: 'HII',
      company: 'Huntington Ingalls Industries',
      keywords: ['huntington', 'ingalls', 'hii'],
      specialties: ['shipbuilding', 'naval', 'aircraft carrier']
    },
    {
      symbol: 'LDOS',
      company: 'Leidos',
      keywords: ['leidos', 'ldos'],
      specialties: ['it services', 'intelligence', 'surveillance']
    },
    {
      symbol: 'PLTR',
      company: 'Palantir Technologies',
      keywords: ['palantir', 'pltr'],
      specialties: ['data analytics', 'intelligence', 'ai']
    }
  ];

  for (const contractor of defenseContractors) {
    let confidence = 0;
    let reasoning = '';

    // Check for direct company name matches
    for (const keyword of contractor.keywords) {
      if (contractText.includes(keyword)) {
        confidence += 0.8;
        reasoning += `Direct mention of ${keyword}. `;
        break;
      }
    }

    // Check for specialty area matches
    for (const specialty of contractor.specialties) {
      if (contractText.includes(specialty)) {
        confidence += 0.3;
        reasoning += `Contract involves ${specialty} (${contractor.company} specialty). `;
      }
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    if (confidence >= 0.3) {
      impactedStocks.push({
        symbol: contractor.symbol,
        company: contractor.company,
        confidence,
        reasoning
      });
    }
  }

  return impactedStocks.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Assess the potential market impact of a defense contract
 */
function assessContractMarketImpact(amount: number, description: string): {
  level: 'high' | 'medium' | 'low';
  reasoning: string;
  factors: string[];
} {
  const factors: string[] = [];
  let impactScore = 0;
  
  // Amount-based impact
  if (amount > 1000000000) { // $1B+
    impactScore += 3;
    factors.push('Large contract value (>$1B)');
  } else if (amount > 100000000) { // $100M+
    impactScore += 2;
    factors.push('Significant contract value (>$100M)');
  } else if (amount > 10000000) { // $10M+
    impactScore += 1;
    factors.push('Notable contract value (>$10M)');
  }

  const desc = description.toLowerCase();
  
  // High-impact keywords
  const highImpactKeywords = [
    'aircraft', 'submarine', 'destroyer', 'fighter', 'missile defense',
    'satellite', 'cyber warfare', 'artificial intelligence', 'autonomous'
  ];
  
  const mediumImpactKeywords = [
    'maintenance', 'upgrade', 'modification', 'support services',
    'training', 'logistics', 'spare parts'
  ];

  for (const keyword of highImpactKeywords) {
    if (desc.includes(keyword)) {
      impactScore += 2;
      factors.push(`High-impact technology: ${keyword}`);
    }
  }

  for (const keyword of mediumImpactKeywords) {
    if (desc.includes(keyword)) {
      impactScore += 1;
      factors.push(`Medium-impact service: ${keyword}`);
    }
  }

  // Determine impact level
  let level: 'high' | 'medium' | 'low';
  if (impactScore >= 5) {
    level = 'high';
  } else if (impactScore >= 2) {
    level = 'medium';
  } else {
    level = 'low';
  }

  const reasoning = factors.length > 0 
    ? factors.join('; ')
    : 'Standard defense contract with typical market impact';

  return { level, reasoning, factors };
}