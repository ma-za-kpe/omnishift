import { NextRequest, NextResponse } from 'next/server';
import { openSeaMapService } from '@/lib/openSeaMap';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'positions';
  const region = searchParams.get('region') || 'strait_of_hormuz';
  const vesselTypes = searchParams.get('types')?.split(',') || ['cargo', 'tanker', 'military'];

  try {
    switch (action) {
      case 'positions':
        const positions = await openSeaMapService.getVesselPositions(
          region as any,
          vesselTypes
        );
        return NextResponse.json({
          success: true,
          data: positions,
          region,
          count: positions.length
        });

      case 'traffic':
        const traffic = await openSeaMapService.getVesselTraffic(region);
        return NextResponse.json({
          success: true,
          data: traffic
        });

      case 'events':
        const events = await openSeaMapService.detectMaritimeEvents();
        return NextResponse.json({
          success: true,
          data: events,
          count: events.length
        });

      case 'health':
        return NextResponse.json({
          success: true,
          data: {
            status: 'operational',
            provider: 'OpenSeaMap + AISHub',
            features: [
              'Vessel position tracking',
              'Traffic congestion analysis', 
              'Maritime event detection',
              'Strategic waterway monitoring'
            ],
            regions: [
              'suez_canal',
              'strait_of_hormuz', 
              'gibraltar',
              'malacca',
              'panama_canal'
            ],
            lastUpdate: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available: positions, traffic, events, health'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Vessel tracking API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vessel data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}