// TOUR DE BLOCK BENCHMARK
//
// Copyright (c) 2013 Intel, see notice below.
//
// To adjust the time taken by this program, run with `-e NUM_TICKS=N`
// (default is 10).
//
// To see timing results from the shell, run with `-e TIME=1`.
// To see a comparison against sequential as well, run with `-e TIME=2`.

if (typeof NUM_TICKS === "undefined")
  NUM_TICKS = 10;

if (typeof TIME === "undefined")
  TIME = 0;

/*
   Tour de Block
Designed by Indigo Kelleigh, Developed by Vance Feldman, Original c++ engine by Ben Kenwright
Ported to Parallel JavaScript by Stephan Herhut and Jaswanth Sreeram.

Copyright (c) 2013, Intel Corporation
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    - Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    - Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
    SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
THE POSSIBILITY OF SUCH DAMAGE.
*/






/************************ README ***************/
/*
* This is a shell version of the collision detection portion of Tour De Block.
* The entry point to this program is at the very end of this file (engine.Update())
* To switch to sequetial execution, change the COLLISION_PJS flag below to false.
*
*/

var T = TypedObject;

// Globals
var g_timeStep          = 0.05;			// Timing
var g_paused            = false;
var g_singleStep        = false;
var g_totalTime         = 0.0;
var g_wireView          = false;
var g_friction          = .9;
var g_gravity           = -9.8;
var g_cubes = [];
var g_numCubes          = 100;
var g_positionCorrection = true;  // Sinking fix!
var	g_numIterations = 4;

var COLLISION_PJS = true;

OBBEngine = function () {
    g_numCubes = 100;
    createWorld();
    // CREATE AN INSTANCE OF THE ENGINE!
}



var normalMeshes = new Array();
function /*int*/ GetNumHitPoints( /*Cube*/  idx,
							/*vec3*/        hitNormal,
							/*f*/           penetration)
							/*array<vec3>*/ //verts,          // out        // this is just an array of 8 vec3s used to be /*vec3*/ verts[8]
							/*int*/         //vertIndexs)     // out
{

    var verts = new Array();
    var vertIndexs = new Array();

  

	var x = g_cubes[idx].m_e[0];
	var y = g_cubes[idx].m_e[1];
	var z = g_cubes[idx].m_e[2];
	//var y = CubeList._m_e[idx][1];
	//var z = CubeList._m_e[idx][2];
	var Vertex =
	[
    	[   -x,     y,      -z],
		[   x,      y,      -z],
		[   x,      y,      z],
		[   -x,     y,      z],

		[  -x,   -y,      -z	],
		[   x,   -y,	  -z	],
		[   x,   -y,	   z	],
		[  -x,   -y,	   z	]	
	]
    var m_matWorld = g_cubes[idx].m_matWorld;
	for (var i=0; i<8; i++)
	{
		Vertex[i] = vec3_transform_coord(Vertex[i], m_matWorld);
	}

	
	var planePoint = Vertex[0];
	var maxdist = vec3_dot(Vertex[0], hitNormal);

	for (var i=0; i<8; i++)
	{
		var d = vec3_dot(Vertex[i], hitNormal);
		if (d > maxdist)
		{
			maxdist = d;
			planePoint = Vertex[i];
		}
	}
	
	var d = vec3_dot(planePoint, hitNormal);
	d -= penetration + .1;

	var numVerts = 0;
	for (var i=0; i<8; i++)
	{
		var side = vec3_dot(Vertex[i], hitNormal) - d;
		
		if ( side > 0 )
		{
			verts[numVerts] = Vertex[i];
			vertIndexs[numVerts] = i;
			numVerts++;
		}
	}

	return [numVerts, verts, vertIndexs];
}

/***************************************************************************/

function /*bool*/ VertInsideFace(/*vec3*/ verts0, /*vec3*/ p0 )  
{
    var planeErr = 0.00;

	// Work out the normal for the face
	var v0 = vec3_sub( verts0[1] , verts0[0] );
	var v1 = vec3_sub( verts0[2] , verts0[0] );
	var n  = vec3_cross(v1, v0);
	n = vec3_normalize(n);

	for (var i=0; i<4; i++)
	{
		var s0 = verts0[i];
		var s1 = verts0[(i+1)%4];
		var sx = vec3_add( s0 , vec3_scale( 10, n));

		// Work out the normal for the face
		var sv0 = vec3_sub( s1 , s0);
		var sv1 = vec3_sub( sx , s0);
		var sn  = vec3_cross(sv1, sv0);
		sn = vec3_normalize(sn);

		var d  = vec3_dot(s0, sn);
		var d0 = vec3_dot(p0, sn) - d;                             

		// Outside the plane
		if (d0 > planeErr) {
			return false;
		}
	}

	return true;
    
}

function SortVertices(verts0, vertIndexs0)
{
    var faces =
	[
	    [4,0,3,7],
		[1,5,6,2],
	    [0,1,2,3],
		[7,6,5,4],
	    [5,1,0,4],
		[6,7,3,2]
	];

    var faceSet = -1;
    var temp=[0,0,0,0]; // New correct clockwise order

    // Work out which face to use
    for (var i=0; i<6 && faceSet==-1; i++)
    {
		var numFound = 0;
		for (var j=0; j<4; j++)
        {
			if (vertIndexs0[j]==faces[i][j])
            {
		    temp[numFound] = verts0[j];
		    numFound++;

		    if (numFound==4)
            {
				faceSet = i;
				break;
            }
        }
    }
    }

    if (faceSet < 0)
    {
        var errorHasOccured = 1;
    }
    else
    {
        for (var i=0; i<4; i++)
        {
			    verts0[i] = temp[i];
        }
    }

    return verts0;
}



function /*void*/ ClipFaceFaceVerts(	/*vec3*/ verts0,
								        /*int*/ vertIndexs0,
								        /*vec3*/ verts1,
								        /*int*/ vertIndexs1,
								        /*vec3*/ vertsX,
								        /*int*/ numVertsX)
{

    var i;

	// Work out the normal for the face
	var v0 = vec3_sub( verts0[1] , verts0[0] );
	var v1 = vec3_sub( verts0[2] , verts0[0] );
	var  n  = vec3_cross(v1, v0);
	n = vec3_normalize(n);


	// Project all the vertices onto a shared plane, plane0
	var vertsTemp1 = new Array();
	for (i=0; i<4; i++) {
		vertsTemp1[i] = vec3_add( verts1[i] , vec3_scale( vec3_dot(n, vec3_sub( verts0[0], verts1[i])), n  )); 
	}

	var temp = new Array();
	var numVerts = 0;

	for (var c=0; c<2; c++)
	{
		var vertA = vertsTemp1;
		var vertB = verts0;
		if (c==1)
		{
			vertA = verts0;
			vertB = vertsTemp1;
		}

		// Work out the normal for the face
		var v0 = vec3_sub( vertA[1] , vertA[0]);
		var v1 = vec3_sub( vertA[2] , vertA[0]);
		var n  = vec3_cross(v1, v0);
		n = vec3_normalize(n);

		for (i=0; i<4; i++)
		{
		    var s0 = [0, 0, 0];
            if( vertA[i] ) s0 = vertA[i];
			var s1 = vertA[(i+1)%4];
			var sx = vec3_add( s0 , vec3_scale( 10 , n ) );

			// Work out the normal for the face
			var sv0 =  vec3_sub( s1 , s0);
			var sv1 = vec3_sub( sx , s0);

			var sn = vec3_cross(sv1, sv0);	
			sn = vec3_normalize(sn);   
			var d = vec3_dot(s0, sn);   
            			

			for (var j=0; j<4; j++)
			{
				var p0 = vertB[j];
				var p1 = vertB[(j+1)%4]; // Loops back to the 0th for the last one

				var d0 = vec3_dot(p0, sn) - d;
				var d1 = vec3_dot(p1, sn) - d;
				
				// Check if they're on opposite sides of the plane
				if ( (d0 * d1) < 0.0)
				{
				  
				    var pX = vec3_add(p0, vec3_scale((vec3_dot(sn, vec3_sub(s0 , p0)) / vec3_dot(sn, vec3_sub(p1 , p0))), vec3_sub(p1 , p0)));

					if (VertInsideFace(vertA, pX))
					{
						temp[numVerts] = pX;
						numVerts++;
					}
				}

				
				if (VertInsideFace(vertA, p0))
				{
					temp[numVerts] = p0;
					numVerts++;
				}
			
			
			}
		}
		
}

	// Remove verts which are very close to each other
	for (var i=0; i<numVerts; i++)
	{
		for (var j=i; j<numVerts; j++)
		{
			if (i!=j)
			{
				var dist = vec3_lengthSquared( vec3_sub( temp[i] , temp[j] ) );

				if (dist < 6.5)                                                         //<--- arbitrary number
				{
					for (var k=j; k<numVerts; k++)
					{
						temp[k] = temp[k+1];
					}
					numVerts--;
				}
			}
		}
	}

    return [ temp, numVerts];

}

/***************************************************************************/


/***************************************************************************/

function ClosestPtPointOBB( point, 
					        idx)
{

    var closestP = [0, 0, 0];
	var q = g_cubes[idx].m_c;
    var m_e = g_cubes[idx].m_e;
    var m_u = g_cubes[idx].m_u;
    var m_c = g_cubes[idx].m_c;
	var d = vec3_sub( point , m_c);

	var dist;

	for (var i = 0; i < 3; i = i + 1)
	{
	    dist = vec3_dot(d, m_u[i]);

	    if (dist > m_e[i]) dist = m_e[i];
	    if (dist < -m_e[i]) dist = -m_e[i];

		q = vec3_add(q, vec3_scale(dist, m_u[i]));
	}

	closestP = q;
    return closestP;
}

/***************************************************************************/

function ClipLinePlane(	verts0,	idx)
{
                                                        

    var vertsX = new Array();

    vertsX[0] = ClosestPtPointOBB(verts0[0], idx);
    vertsX[1] = ClosestPtPointOBB(verts0[1], idx);
	

	return vertsX;
	
}

/***************************************************************************/

function ClosestPointLineLine( 	verts0,	
						     	verts1  ) {
    var vertsX = new Array();
    var numVertX = 2;

    

	var p1 = verts0[0];     //vec
	var q1 = verts0[1];     //vec
	var p2 = verts1[0];     //vec
	var q2 = verts1[1];     //vec

	var d1 = vec3_sub( q1 , p1);       //vec
	var d2 = vec3_sub( q2 , p2);       //vec
	var r  = vec3_sub( p1 , p2);       //vec
	var a = vec3_dot(d1, d1);   //f
	var e = vec3_dot(d2, d2);   //f
	var f = vec3_dot(d2, r);    //f

	var epsilon = 0.0001;

	var s, t; //f
	var  c1, c2; //vec

	if (a <= epsilon && e <= epsilon)
	{
		s = t = 0.0;
		c1 = p1;
		c2 = p2;

		vertsX[0] = c1;
		numVertX = 1;
		return [vertsX, numVertX];
	}

	if (a <= epsilon)
	{
		s = 0.0;
		t = f / e;
		t = clamp(t, 0.0, 1.0);
	}
	else
	{
		var c = vec3_dot(d1, r);
		if (e <= epsilon)
		{
			t = 0.0;
			s = clamp(-c/a, 0.0, 1.0);
		}
		else
		{
			var b = vec3_dot(d1, d2);
			var denom = a*e - b*b;

			if (denom != 0.0)
			{
				s = clamp((b*f - c*e) / denom, 0.0, 1.0);
			}
			else
			{
				s = 0.0;
			}

			t = (b*s + f) / e;

			if (t < 0.0)
			{
				t = 0.0;
				s = clamp(-c / a , 0.0, 1.0);
			}
			else if (t > 1.0)
			{
				t = 1.0;
				s = clamp((b-c) / a, 0.0, 1.0);
			}
		}
	}

	
	c1 = vec3_add(p1,vec3_scale(s,d1));
	c2 = vec3_add(p2,vec3_scale(t,d2));

	vertsX[0] = vec3_scale( .5, vec3_add(c1 , c2) );
	
    numVertX=1;
    return [vertsX, numVertX];
}

/***************************************************************************/

var debugSpheres = new Array();

function CalculateHitPoint(  /*Cube*/   idx0, 
						 /*Cube*/       idx1,
						 /*f*/          penetration,
						/*vec3*/        hitNormal)
{
    var hitPoints = new Array();
    var numHitPoints = 0;

    
	var verts0 = new Array();
	var vertIndex0 = new Array();
	var norm0 = hitNormal;
	var results0 = GetNumHitPoints(  idx0,
									 norm0,
									 penetration);


	var numVerts0 = results0[0];
	verts0 = results0[1];
	vertIndex0 = results0[2];

	var verts1 = new Array();
	var vertIndex1 = new Array();
	var norm1 = vec3_scale( -1, hitNormal );
	var results1 = GetNumHitPoints(     idx1,
									    norm1,
									    penetration);
	var numVerts1 = results1[0];
	verts1 = results1[1];
	vertIndex1 = results1[2];

	// This should never really happen!
	if (numVerts0==0 || numVerts1==0) {
		return;
	}

	var numVertsX		= numVerts0;
	var vertsX          = verts0;

	var cpLineResult;
    
	/*if (numVerts0 >= 4 && numVerts1 >= 4) {


	    var clipVerts = new Array();
	    var clipResult = ClipFaceFaceVerts(     verts0, vertIndex0,             //<----- maybe some more outs needed
							                    verts1, vertIndex1,
							                    clipVerts, numVertsX);

	    vertsX = clipResult[0];
	    numVertsX = clipResult[1];


	} else*/ if (numVerts1 < numVerts0) {

	    numVertsX = numVerts1;
	    vertsX = verts1;
	    hitNormal = vec3_scale(-1, norm1);

	} else if (numVerts1 == 2 && numVerts0 == 2) {

	    var linLineResult = ClosestPointLineLine(verts0, verts1);

	    vertsX = linLineResult[0];
	    numVertsX = linLineResult[1];

	} else if (numVerts0 == 2 && numVerts1 == 4) {

	    cpLineResult = ClipLinePlane(verts0, idx1);
	    vertsX = cpLineResult;
	    numVertsX = 2;

	} else if (numVerts0 == 4 && numVerts1 == 2) {

	    cpLineResult = ClipLinePlane(verts1, idx0);
	    vertsX = cpLineResult;
	    numVertsX = 2;
	} else  {
	    numVertsX = numVerts0;
	    vertsX = verts0;
	}
    


	numVertsX = numVerts0;
	vertsX = verts0;

    return [vertsX, numVertsX];
    
}

var Mat4 = function() {
    return [1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1];
}


var Cube = function(pos, rot, size, mass) {
    //print("Creating cube with " + pos + " " + rot + " " + size +  " " + mass);
    this.m_c = pos;
    this.m_u = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    this.m_e = [0, 0, 0];
    this.m_matWorld = Mat4();
    this.m_rot = new Quaternion();
}

function getRandomScalar(n) {
    return Math.random()*n;
}
function getRandomVector(n) {
    return [getRandomScalar(n), getRandomScalar(n), getRandomScalar(n)];
}


function createWorld () {
    for(var i = 0; i < g_numCubes; i++) {
        var body = new Cube(getRandomVector(10), getRandomVector(10), getRandomVector(120), getRandomScalar(1));
        g_cubes.push(body);
    }
}

var doAlert = 0;

/***************************************************************************/
var cycle = 0;
var step = 0;
var doPause = false;

var Pairs = T.uint32.array(2).array();
var Point = T.float64.array(3);
var HitResult = new T.StructType({hitBox: T.uint8,
                                  hitPoints: Point.array(8),
                                  numHitPoints: T.uint8,
                                  penetrationBox: T.float64,
                                  hitNormalBox: Point});
var HitResults = HitResult.array();

function CubeCubeCollisionCheck_PJS(pair, _, _, /*HitResult*/ out) {
    //print("Doing collision detection for pair [" + pair[0] + ", " + pair[1] + "]");
    var idx0 = pair[0];
    var idx1 = pair[1];

    if (idx1 <= idx0)
      return;

    var cube0 = g_cubes[idx0];
    var cube1 = g_cubes[idx1];

    var m_radius0 = cube0.m_radius;
    var m_radius1 = cube1.m_radius;

    var m_e0 = cube0.m_e;
    var m_e1 = cube1.m_e;

    var m_u0 = cube0.m_u;
    var m_u1 = cube1.m_u;

    var m_c0 = cube0.m_c;
    var m_c1 = cube1.m_c;

	// Simple bounding sphere check first
    var len = (m_radius0 + m_radius1);
    var lensq = len * len;
    var diff = vec3_lengthSquared(vec3_sub(m_c1, m_c0));
    if (vec3_lengthSquared(vec3_sub(m_c1, m_c0)) > (len * len))
      return;

	var hit = 1;
	var p = 10000.0;
	/*vec3*/ var lnormal = [0,0,0];

	var result;


	result = SpanIntersect(idx0, idx1, m_u0[0], p, lnormal);
	if (result[0] == 0)
	    return;
	p = result[1];
	lnormal = result[2];

	result = SpanIntersect(idx0, idx1, m_u0[1], p, lnormal);
	if (result[0] == 0)
	    return;
	p = result[1];
	lnormal = result[2];

	result = SpanIntersect(idx0, idx1, m_u0[2], p, lnormal);
	if (result[0] == 0)
	    return;
	p = result[1];
	lnormal = result[2];

	result = SpanIntersect(idx0, idx1, m_u1[0], p, lnormal);
	if (result[0] == 0)
	    return;
	p = result[1];
	lnormal = result[2];

	result = SpanIntersect(idx0, idx1, m_u1[1], p, lnormal);
	if (result[0] == 0)
      return;
	p = result[1];
	lnormal = result[2];

	result = SpanIntersect(idx0, idx1, m_u1[2], p, lnormal);
	if (result[0] == 0)
	    return;
	p = result[1];
	lnormal = result[2];



	result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[0], m_u1[0]), p, lnormal);
	if (result[0] == 0)
	    return;
    p = result[1];
    lnormal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[0], m_u1[1]), p, lnormal);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[0], m_u1[2]), p, lnormal, false);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[1], m_u1[0]), p, lnormal);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[1], m_u1[1]), p, lnormal);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[1], m_u1[2]), p, lnormal);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[2], m_u1[0]), p, lnormal);
    if (result[0] == 0)
        return;
    p = result[1];
    lnormal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[2], m_u1[1]), p, lnormal);
    if (result[0] == 0)
        //return;
        return ret;
    p = result[1];
    lnormal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(m_u0[2], m_u1[2]), p, lnormal);
    if (result[0] == 0)
        return;

    p = result[1];
    lnormal = result[2];

	if ((lnormal[0] != 0 || lnormal[1] != 0 || lnormal[2] != 0) && hit == 1) {

	    //doPause = true;


		var hpResult = CalculateHitPoint(       idx0, 
							                    idx1,
							                    p,
							                    lnormal)


		for (var i = 0; i < hpResult[1]; i++) {

		    if (hpResult[0][i]) {
              // FIXME Bug 933289 Optimize Complex Assignments
              var x = hpResult[0][i][0];
              var y = hpResult[0][i][1];
              var z = hpResult[0][i][2];
              out.hitPoints[i][0] = x;
              out.hitPoints[i][1] = y;
              out.hitPoints[i][2] = z;
            }
        }


        out.numHitPoints = hpResult[1];

       //trace("hitpoints non ocl " + hitPoints );

		out.penetrationBox = p;

        // FIXME Bug 933289 Optimize Complex Assignments
        var tmp = vec3_scale(-1, lnormal);
		out.hitNormalBox[0] = tmp[0];
		out.hitNormalBox[1] = tmp[1];
		out.hitNormalBox[2] = tmp[2];


    }

//penetrationBox = penetrationBox * 10;
    out.hitBox = hit;
}

function /*bool*/ CubeCubeCollisionCheck(/*cube*/   idx0, 
							/*cube*/                idx1) {


    // -- OUT VARS ---------------------------------------
    /*D3DXVECTOR3*/var hitPoints = new Array();
    /*int*/var numHitPoints = 0;
    /*float*/var penetrationBox = 0.0;
    /*D3DXVECTOR3*/var hitNormalBox = [0, 0, 0];
    //----------------------------------------------------

    if (idx1 <= idx0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];


	// Simple bounding sphere check first
    var len = (CubeList._m_radius[idx0] + CubeList._m_radius[idx1]);
    var lensq = len * len;
    var diff = vec3_lengthSquared(vec3_sub(CubeList._m_c[idx1], CubeList._m_c[idx0]));
    if (vec3_lengthSquared(vec3_sub(CubeList._m_c[idx1], CubeList._m_c[idx0])) > (len * len)) {
	    
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	}    

	var hit = 1;
	var p = 10000.0;
	/*vec3*/ normal = [0,0,0];

	var result;


	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx0][0], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];

	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx0][1], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];

	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx0][2], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];

	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx1][0], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];

	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx1][1], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];

	result = SpanIntersect(idx0, idx1, CubeList._m_u[idx1][2], p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
	p = result[1];
	normal = result[2];



	result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][0], CubeList._m_u[idx1][0]), p, normal);
	if (result[0] == 0)
	    return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][0], CubeList._m_u[idx1][1]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][0], CubeList._m_u[idx1][2]), p, normal, false);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][1], CubeList._m_u[idx1][0]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][1], CubeList._m_u[idx1][1]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];


    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][1], CubeList._m_u[idx1][2]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][2], CubeList._m_u[idx1][0]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][2], CubeList._m_u[idx1][1]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    p = result[1];
    normal = result[2];

    result = SpanIntersect(idx0, idx1, vec3_cross(CubeList._m_u[idx0][2], CubeList._m_u[idx1][2]), p, normal);
    if (result[0] == 0)
        return [0, hitPoints, numHitPoints, penetrationBox, hitNormalBox];

    p = result[1];
    normal = result[2];

   

	numHitPoints = 0;

	hitPoints = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];




	if ((normal[0] != 0 || normal[1] != 0 || normal[2] != 0) && hit == 1) {

	    doPause = true;


		var hpResult = CalculateHitPoint(       idx0, 
							                    idx1,
							                    p,
							                    normal)


		for (var i = 0; i < 8; i++) {

		    if (hpResult[0][i])
		        hitPoints[i] = hpResult[0][i];

		}


        
        numHitPoints = hpResult[1];

       //trace("hitpoints non ocl " + hitPoints );

		penetrationBox = p;
		hitNormalBox = vec3_scale(-1, normal);


    }

//penetrationBox = penetrationBox * 10;

return [hit, hitPoints, numHitPoints, penetrationBox, hitNormalBox];
    
}

/***************************************************************************/


/***************************************************************************/


function /*bool*/SpanIntersect(                     idx0,
							                        idx1,
                                        /*vec3*/    axisc,
                                        /*float*/   minPenetration, //out
                                        /*vec3*/    axisPenetration//out
                                                    )

{

    /*vec3*/var axis = axisc;
    var lq = vec3_lengthSquared(axis); 
    var ret = [];
    
    if (lq <= 0.02 ) {
        //pen = 100000.0;
        //return [1, minPenetration, axisPenetration];
        ret[0] = 1;
        ret[1] = minPenetration;
        ret[2] = axisPenetration;
        return ret;
    }
    
    axis = vec3_normalize(axis);

    var mina, maxa;
    var minb, maxb;


    var resultA = CalculateInterval(idx0, axis, mina, maxa); // used to get ref out
    mina = resultA[0];
    maxa = resultA[1];

    var resultB = CalculateInterval(idx1, axis, minb, maxb); // used to get ref out
    minb = resultB[0];
    maxb = resultB[1];

    var lena = maxa - mina;
    var lenb = maxb - minb;

    var minv = (mina < minb) ? mina : minb;             //Math.min(mina, minb);
    var maxv = (maxa > maxb) ? maxa : maxb;             //Math.max(maxa, maxb);
    var lenv = maxv - minv;
       

    if (lenv > (lena + lenb)) {       
        // NO Collision
        return [0, minPenetration, axisPenetration];
    }

    var penetration = (lena + lenb) - lenv;
        if (penetration < minPenetration) {
            minPenetration = penetration;
            axisPenetration = axis;

            // BoxA pushes BoxB away in the correct Direction
            if (minb < mina) {

                axisPenetration = vec3_scale(-1, axisPenetration);
            }
        }

    // Colllision
    ret[0] = 1;
    ret[1] = minPenetration;
    ret[2] = axisPenetration;
    return ret;
    //return [1, minPenetration, axisPenetration];
}


function /*void*/CalculateInterval(/*cube*/idx, /*vec3*/axis, /*float*/min, /*float*/max, doDebug) {
    var x = g_cubes[idx].m_e[0];
    var y = g_cubes[idx].m_e[1];
    var z = g_cubes[idx].m_e[2];
    //var y = CubeList._m_e[idx][1];
    //var z = CubeList._m_e[idx][2];
    var Vertex = new Array();
    /*arr<vec3>*/Vertex = [

                            [x, y, -z],
		                    [-x, y, -z],
		                    [x, -y, -z],
		                    [-x, -y, -z],
                            

                            [x, y, z],
		                    [-x, y, z],
		                    [x, -y, z],
		                    [-x, -y, z]
                            ];

    var m_matWorld = g_cubes[idx].m_matWorld;
    for (var i = 0; i < 8; i++) {
        Vertex[i] = vec3_transform_coord(Vertex[i], m_matWorld);
   }

   

    var dot =  vec3_dot(Vertex[0], axis);

    min = dot;
    max = dot;


    for (var i = 0; i < 8; i++) {
        var d = vec3_dot(Vertex[i], axis);

        if (d < min) min = d;
        if (d > max) max = d;
    }

    return [min, max];

}


//var CubeList;

/***************************************************************************/







stPoint = function()
{
	/*D3DXVECTOR3*/ this.point = [0,0,0];
	/*D3DXVECTOR3*/ this.normal =  [0,0,0];
	/*float*/		this.pen = 0;
	/*D3DXVECTOR3*/ this.pos0 =  [0,0,0];
	/*D3DXVECTOR3*/ this.pos1 =  [0,0,0];
};

// Collision information
stCollisionPoints =  function()
{
	/*Cube**/       this.box0 = null; //new Cube();  // <----------- TODO : define the intial state/rotation of the cube
	/*Cube**/       this.box1 = null; //new Cube();
	/*stPoint*/     this.points = []; // will contain stPoint objects
	/*int*/         this.numPoints = 0;
};


stCollisions = function()
{
    // INSTANTIATE A Collisions Object
}

stCollisions.prototype.Clear = function ()
{
	g_numCols = 0;
}

// add collision objects to master list
stCollisions.prototype.Add = function (
/*Cube Index*/box0,
/*Cube Index*/box1,
/*vec3*/point,
/*vec3*/normal,
/*float*/pen) {
    // First we determine if we have any collisions between these two
    // rigid bodies and store them in that array...so we can group
    // rigid body collisions....very useful in the long run


    /*stCollisionPoints*/var cp = null;                                    

    for (var i = 0; i < g_numCols; i++) {
        if (g_CollisionsArray[i].box0 == box0 &&
			g_CollisionsArray[i].box1 == box1) {
            cp = g_CollisionsArray[i];                                      
            break;
        }
    }

    // We've not found one, hence add it to our list, with the data
    // and return
    if (cp == null) {
        g_CollisionsArray[g_numCols] = new Object();                        
        g_CollisionsArray[g_numCols].box0 = box0;
        g_CollisionsArray[g_numCols].box1 = box1;
        g_CollisionsArray[g_numCols].numPoints = 1;
        g_CollisionsArray[g_numCols].points = new Array();
        g_CollisionsArray[g_numCols].points[0] = new Object();
        g_CollisionsArray[g_numCols].points[0].normal = normal;
        g_CollisionsArray[g_numCols].points[0].point = point;
        g_CollisionsArray[g_numCols].points[0].pos0 = g_cubes[box0].m_c;
        g_CollisionsArray[g_numCols].points[0].pos1 = g_cubes[box1].m_c;
        g_CollisionsArray[g_numCols].points[0].pen = pen;


        

        g_numCols++;
        return;
    }


    // Multiple collision points between a single rigid body, so add
    // it to our array
    cp.points[cp.numPoints] = new Object();
    cp.points[cp.numPoints].normal = normal; 
    cp.points[cp.numPoints].point = point;
    cp.points[cp.numPoints].pos0 = g_cubes[box0].m_c;
    cp.points[cp.numPoints].pos1 = g_cubes[box1].m_c;
    cp.points[cp.numPoints].pen = pen;

    cp.numPoints++;

}

var g_CollisionsArray = new Array(); //[100];
var g_numCols = 0;

var g_Collisions = new stCollisions(); // Single list of all the collisions are stored in this variable

/* not used, see main game app */
OBBEngine.prototype.CreateCubeSetup = function (  config )
{
	g_Collisions.Clear();
}


OBBEngine.prototype.UpdateTiming = function (delay) {
    g_timeStep = delay;
}

var totalSeqHits;
OBBEngine.prototype.CollisionDetection = function () {

    g_Collisions.Clear();

    totalSeqHits = 0;

    // Check Cube-Cube Collisions
    var hitResult = new HitResult();
    for (var i = 0; i < g_numCubes; i++) {
        for (var j = 0; j < g_numCubes; j++) {
            if (j > i) {
              CubeCubeCollisionCheck_PJS([i, j], undefined, undefined, hitResult);
                if (hitResult.hitBox)
                    totalSeqHits += hitResult.numHitPoints;
            }
        }
    }
}

OBBEngine.prototype.CollisionDetection_PJS = function () {

    g_Collisions.Clear();

    totalSeqHits = 0;

    if (cube_indices_base !== g_numCubes) {
      var numPairs = 0;
      for (var i = 0; i < g_numCubes; ++i)
        for (var j = i+1; j < g_numCubes; ++j)
          numPairs++;

      cube_indices = new Pairs(numPairs);
      var numPairs = 0;
      for (var i = 0; i < g_numCubes; ++i) {
        for (var j = i+1; j < g_numCubes; ++j) {
          cube_indices[numPairs++] = [i, j];
        }
      }
      cube_indices_base = g_numCubes;
    }
    hitResult = HitResults.fromPar(cube_indices, CubeCubeCollisionCheck_PJS);
    for (var p = 0; p < cube_indices.length; p++) {
        if (hitResult[p].hitBox)
            totalSeqHits += hitResult[p].numHitPoints;
    }
}




var num_recompilations = 0, num_collision_checks = 0, first_ocl_run = false, tri_index = [], tri_idx = 0, collision_time = 0;
var pa_size = 150; // Too low and we'll trigger recompilation, too high and we're inefficient.
var num_hits = 0, num_hits_accumulator =[];
var cube_indices = [];
var cube_indices_base = 0;
var hitting_pairs;
var normals;


/***************************************************************************/


OBBEngine.prototype.ApplyImpulses = function (/*float*/dt) {

    // CAN WE SORT BY Y POSITION to approximate level?
    for (var i = 0; i < g_numCols; i++) {
        var cp = g_CollisionsArray[i];                    

        var box0 = cp.box0;
        var box1 = cp.box1;
        var numPoints = cp.numPoints;

        for (var k = 0; k < numPoints; k++) {

            var hitPoint = cp.points[k].point;
            var normal = cp.points[k].normal;
            var penDepth = cp.points[k].pen;
           
            AddCollisionImpulse(            box0,
										    box1,
										    hitPoint,
										    normal,
										    dt,
										    penDepth);
        }
       
    }
}



OBBEngine.prototype.UpdateSleepingObjects = function () {
    // For an object to remain sleeping, it must be in collision with another
    // sleeping object or infinite mass object
    // or its energy/motion is less than a certain threshold


    for (var k = 0; k < g_numCubes; k++) {
        // Check its hitting another object
        var sleepingCollision = false;
        for (var i = 0; i < g_numCols; i++) {
            var cp = g_CollisionsArray[i];

            var box0 = cp.box0;
            var box1 = cp.box1;

            var sleepCube = k;
            var otherCube = null;

            if (sleepCube == box0) otherCube = box1;
            if (sleepCube == box1) otherCube = box0;

            if (otherCube != null) {
                if (!g_cubes[otherCube].m_awake == 1 || g_cubes[otherCube].m_mass > 9999) {
                    sleepingCollision = (sleepingCollision | true);
                }
            }
        }

        var cube = g_cubes[k];

        if (!sleepingCollision) {
            cube.m_rwaMotion = 2 * g_sleepEpsilon;
            cube.m_awake = 1; //true;
        }

        // Check its energy/motion
        if (cube.m_rwaMotion < g_sleepEpsilon && cube.m_awake == 1) {
            cube.m_awake = 0; //false;
            cube.m_linVelocity = [0, 0, 0];
            cube.m_angVelocity = [0, 0, 0];
        }
        else if (cube.m_rwaMotion > 10 * g_sleepEpsilon) {
            cube.m_rwaMotion = 10 * g_sleepEpsilon;
            cube.m_awake = 1; //true;
        }

        // Check if a cube in collision with our sleeping cube
        // has enough energy to wake it up
        for (var i = 0; i < g_numCols; i++) {
            cp = g_CollisionsArray[i];

            var box0 = cp.box0;
            var box1 = cp.box1;

            var sleepCube = k;
            var otherCube = null;

            if (sleepCube == box0) otherCube = box1;
            if (sleepCube == box1) otherCube = box0;

            if (otherCube && g_cubes[otherCube].m_mass < 10000) {
                if (g_cubes[otherCube].m_rwaMotion > (2 * g_sleepEpsilon)) {
                    cube.m_awake = 1;
                    cube.m_rwaMotion = 2 * g_sleepEpsilon;
                }

            }
        }

    }
}

/***************************************************************************/
/*                                                                         */
/* Update()                                                                */
/* Our main render loop, which gets called over and over agian to do our   */
/* drawing...clears the screen, draws the data, then presents it..         */
/*                                                                         */
/***************************************************************************/
OBBEngine.prototype.Update = function (timingDelay, inParallel) {
    this.UpdateTiming(timingDelay);


    var doSingleStep = false;
    if (!g_paused || g_singleStep) {
        doSingleStep = true;
        g_singleStep = false;
    }

    var timeScale = 1.0;
    var overlapTime = 0.0;
    var timeStepFrame = 1.0 / 100.0; // (100Hz)


    var dt = g_timeStep * timeScale;


    var totalTime = dt + overlapTime;

    if (totalTime > 0.1)                            //< -------------- note the clamping here
    {
        // ERROR.. TimeStep greater than 0.1f!.. Clamp our
        // timestep to 0.1f!
        totalTime = 0.1;
    }

    // Split the timestep into fixed size chunks
    var numLoops = (totalTime / timeStepFrame);
    var timeStep = timeStepFrame;
    overlapTime = totalTime - numLoops * timeStep;

    // If its single step, just step at 0.01ms per timestep
    if (g_paused && doSingleStep) {
        numLoops = 1;
        timeStep = timeStepFrame;
    }

    if (doSingleStep)
        for (var i = 0; i < numLoops; ++i) {
            g_totalTime += timeStep;

            // Collision Detection
            if (inParallel) {
                this.CollisionDetection_PJS();
            } else {
                this.CollisionDetection();
            }

            //    DebugDrawCollisionPoints();

            // Run Physics Steps
            //this.Step(timingDelay);
        }
}


Quaternion = function (x,y,z,w) {

 return [ x || 0,
		  y || 0,
		  z || 0,
		  w !== undefined ? w : 1
        ]
}


function quat_to_mat4 (q) {

    var x2 = q[0] * q[0];
    var y2 = q[1] * q[1];
    var z2 = q[2] * q[2];
    var xy = q[0] * q[1];
    var xz = q[0] * q[2];
    var yz = q[1] * q[2];
    var wx = q[3] * q[0];
    var wy = q[3] * q[1];
    var wz = q[3] * q[2];

	return [ 1.0 - 2.0 * (y2 + z2), 2.0 * (xy - wz), 2.0 * (xz + wy), 0.0,
			2.0 * (xy + wz), 1.0 - 2.0 * (x2 + z2), 2.0 * (yz - wx), 0.0,
			2.0 * (xz - wy), 2.0 * (yz + wx), 1.0 - 2.0 * (x2 + y2), 0.0,
			0.0, 0.0, 0.0, 1.0]

}

function quat_add(q1, q2) {

    return [q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]];
}


function quat_mul(q1, q2) {

    return [q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0],
		 -q1[0] * q2[2] + q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1],
		 q1[0] * q2[1] - q1[1] * q2[0] + q1[2] * q2[3] + q1[3] * q2[2],
		 -q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] + q1[3] * q2[3]];
}

function quat_scale(q, s) {             

    return [q[0] * s, q[1] * s, q[2] * s, q[3] * s];
   
}


function quat_normalize(q) {
       
		var l = Math.sqrt( q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] );

		if (l == 0) {
                return [0,0,0,0];
		} else {
                l = 1/l;
                return [q[0]*l, q[1]*l, q[2]*l, q[3]*l];
		}
		
}


function quat_setFromEuler(vec3) {

        var quat=[0,0,0,0];
		var c = Math.PI / 360, // 0.5 * Math.PI / 360, // 0.5 is an optimization
		x = vec3[0] * c,
		y = vec3[1] * c,
		z = vec3[2] * c,

		c1 = Math.cos( y  ),
		s1 = Math.sin( y  ),
		c2 = Math.cos( -z ),
		s2 = Math.sin( -z ),
		c3 = Math.cos( x  ),
		s3 = Math.sin( x  ),

		c1c2 = c1 * c2,
		s1s2 = s1 * s2;
		
	  	quat[0] = c1c2 * s3  + s1s2 * c3;
		quat[1] = s1 * c2 * c3 + c1 * s2 * s3;
		quat[2] = c1 * s2 * c3 - s1 * c2 * s3;
        quat[3] = c1c2 * c3  - s1s2 * s3;

        return quat;
 }


 function quat_setFromAxisAngle ( axis, angle ) {
        
        var quat = [0,0,0,0];
		var halfAngle = angle / 2,
			s = Math.sin( halfAngle );

		quat[0] = axis[0] * s;
		quat[1] = axis[1] * s;
		quat[2] = axis[2] * s;
		quat[3] = Math.cos( halfAngle );

		return quat;
}


//-------------------------------------      new mat4 functions  


function mat4_add( m1, m2) {
    var ret = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

        ret[0] = m1[0] + m2[0];
        ret[1] = m1[1] + m2[1];
        ret[2] = m1[2] + m2[2];
        ret[3] = m1[3] + m2[3];
        ret[4] = m1[4] + m2[4];
        ret[5] = m1[5] + m2[5];
        ret[6] = m1[6] + m2[6];
        ret[7] = m1[7] + m2[7];
        ret[8] = m1[8] + m2[8];
        ret[9] = m1[9] + m2[9];
        ret[10] = m1[10] + m2[10];
        ret[11] = m1[11] + m2[11];
        ret[12] = m1[12] + m2[12];
        ret[13] = m1[13] + m2[13];
        ret[14] = m1[14] + m2[14];
        ret[15] = m1[15] + m2[15];
   return ret;
}



function mat4_setTranslation ( x, y, z ) {

    return [1, 0, 0, x,
			0, 1, 0, y,
			0, 0, 1, z,
			0, 0, 0, 1];
}


function mat4_setRotationFromQuaternion ( m, q ) {      

    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x, y2 = y + y, z2 = z + z,
		xx = x * x2, xy = x * y2, xz = x * z2,
		yy = y * y2, yz = y * z2, zz = z * z2,
		wx = w * x2, wy = w * y2, wz = w * z2;

		m[0] = 1 - ( yy + zz );
		m[1] = xy - wz;
		m[2] = xz + wy;

		m[4] = xy + wz;
		m[5] = 1 - ( xx + zz );
		m[6] = yz - wx;

		m[8] = xz - wy;
		m[9] = yz + wx;
		m[10] = 1 - ( xx + yy );

		return m;
	}




	function mat4_scale(m, f) {

	    for (var i = 0; i < 16; i++) {
	        m[i] = m[i] * f;
	    }

	    return m;
	}


    

 function mat4_inverse( m  )
 {
        // from: http://www.nigels.com/glt/doc/matrix4_8cpp-source.html
        // Invert matrix m.  This algorithm contributed by Stephane Rehel
        // <rehel@worldnet.fr>

     
     /* NB. OpenGL Matrices are COLUMN major. */


      var det=0;
      var tmp = []; 
 
        /* Inverse = adjoint / det. (See linear algebra texts.)*/
 
        tmp[0]= m[5] * m[10] - m[6] * m[9];
        tmp[1]= m[6] * m[8] - m[4] * m[10];
        tmp[2]= m[4] * m[9] - m[5] * m[8];
 
        /* Compute determinant as early as possible using these cofactors. */
        det= m[0] * tmp[0] + m[1] * tmp[1] + m[2] * tmp[2];
 
        /* Run singularity test. */
        if (det == 0.0) {           
           return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        } 

           var d12, d13, d23, d24, d34, d41;
           var im = [];
 
           det= 1 / det;
 
           /* Compute rest of inverse. */
           tmp[0] = tmp[0] * det;
           tmp[1] = tmp[1] * det;
           tmp[2] = tmp[2] * det;
           tmp[3]  = 0;
 
           im[0]= m[0] * det;
           im[1]= m[1] * det;
           im[2]= m[2] * det;
           im[3]= m[3] * det;
           tmp[4] = im[2] * m[9] - im[1] * m[10];
           tmp[5] = im[0] * m[10] - im[2] * m[8];
           tmp[6] = im[1] * m[8] - im[0] * m[9];
           tmp[7] = 0;
 
           /* Pre-compute 2x2 dets for first two rows when computing */
           /* cofactors of last two rows. */
           d12 = im[0]*m[5] - m[4]*im[1];
           d13 = im[0]*m[6] - m[4]*im[2];
           d23 = im[1]*m[6] - m[5]*im[2];
           d24 = im[1]*m[7] - m[5]*im[3];
           d34 = im[2]*m[7] - m[6]*im[3];
           d41 = im[3]*m[4] - m[7]*im[0];
 
           tmp[8] =  d23;
           tmp[9] = -d13;
           tmp[10] = d12;
           tmp[11] = 0;
 
           tmp[12] = -(m[9] * d34 - m[10] * d24 + m[11] * d23);
           tmp[13] =  (m[8] * d34 + m[10] * d41 + m[11] * d13);
           tmp[14] = -(m[8] * d24 + m[9] * d41 + m[11] * d12);
           tmp[15] =  1;

           tmp = mat4_reflect(tmp);

           return tmp;
   }


   // not used
    function mat4_reflect(m) {
        var out = [];
        out[0] = m[0];
        out[1] = m[4];
        out[2] = m[8];
        out[3] = m[12];
        out[4] = m[1];
        out[5] = m[5];
        out[6] = m[9];
        out[7] = m[13];
        out[8] = m[2];
        out[9] = m[6];
        out[10] = m[10];
        out[11] = m[14];
        out[12] = m[3];
        out[13] = m[7];
        out[14] = m[11];
        out[15] = m[15];
        return out;


    }
    
//-----------------------------------------------  new scaler functions

function clamp(/*float*/v, /*float*/min, /*float*/max) {
    /*float*/var res = v;
    res = v > max ? max : v;
    res = v < min ? min : v;
    return res;
};


function maxf(/*float*/a,/*float*/ b)
{

    if(a>b)
        return a;
    return b;
}

// ----------------------------------------------  new Vec3 functions

function vec3_plus(inOut, vec3) {
   
    return [inOut[0] + vec3[0], inOut[1] + vec3[1], inOut[2] + vec3[2]];
}

function vec3_minus(inOut, vec3) {

    inOut[0] = inOut[0] - vec3[0];
    inOut[1] = inOut[1] - vec3[1];
    inOut[2] = inOut[2] - vec3[2];
    return inOut;
}

function vec3_timesEquals(inOut, f) {

    inOut[0] = inOut[0] * f;
    inOut[1] = inOut[1] * f;
    inOut[2] = inOut[2] * f;
    return inOut;
}

function vec3_divideEquals(inOut, f) {
    if (f == 0) { return; }

    var inv = 1/f;
    inOut[0] = inOut[0] * inv;
    inOut[1] = inOut[1] * inv;
    inOut[2] = inOut[2] * inv;
    return inOut;
}


function vec3_invScale(f, v) {
    if (f == 0) return v;
    var inv = 1 / f;
    
    return [v[0] * inv, v[1] * inv, v[2] * inv];
}


/*D3DXVecTransformCoord */
function vec3_transform_coord(v, m) {
    
    //var out = new Array();
    var vx = v[0], vy = v[1], vz = v[2];
	var	d = 1 / (m[12] * vx + m[13] * vy + m[14] * vz + m[15]); //<------ use this for "transform coord" (project it back)

    var out0 = (m[0] * vx + m[1] * vy + m[2] * vz + m[3]) * d;
    var out1 = (m[4] * vx + m[5] * vy + m[6] * vz + m[7]) * d;
    var out2 = (m[8] * vx + m[9] * vy + m[10] * vz + m[11]) * d;

    return [out0,out1,out2];
}

/* c++ Vec3 * Mat4 */
function vec3_transform(v, m) {

    var x,y,z,w;

    x = v[0] * m[0] + v[1] * m[4] + v[2] * m[8] + m[12];
    y = v[0] * m[1] + v[1] * m[5] + v[2] * m[9] + m[13];
    z = v[0] * m[2] + v[1] * m[6] + v[2] * m[10] + m[11];
    
    return [x, y, z];
}

// ------ modified vec3

function vec3_normalize(v) {

    var d = vec3_length(v);
    if (d != 0)
        return [v[0] / d, v[1] / d, v[2] / d];
   
    return [0,0,0];
    
};


// vector math on vec3
function vec3_addScalar(v1, f) {
    return [v1[0] + f, v1[1] + f, v1[2] + f];
};



//------------------------------------   EXISTING INTEL METHODS ------------------------------------------------------





// vector math on vec3
function vec3_add(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
};

function vec3_sub(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
};
           

function vec3_cross(v1, v2) {
    return      [v1[1] * v2[2] - v1[2] * v2[1],
                v1[2] * v2[0] - v1[0] * v2[2],
                v1[0] * v2[1] - v1[1] * v2[0]];

};



function vec3_lengthSquared(v) {
    return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
};

function vec3_length(v) {
    return Math.sqrt(vec3_lengthSquared(v));
};



function vec3_scale(s, v) {
    return [s * v[0], s * v[1], s * v[2]];
};

function vec3_scaleAdd(s, v1, v2) {
    return [s * v1[0] + v2[0],
                s * v1[1] + v2[1],
                s * v1[2] + v2[2]];
};

function vec3_dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
};

function vec3_negate(v) {
    return [-v[0], -v[1], -v[2]];
};

function vec3_equals(v1, v2) {
    return (v1[0] == v2[0]) && (v1[1] == v2[1]) && (v1[2] == v2[2]);
};

// vector math on quaternions
function quat4_absolute(q) {
    return [Math.abs(q[0]), Math.abs(q[1]), Math.abs(q[2]), Math.abs(q[3])];
};

function quat4_mul(q1, q2) {
    return [q1[0] * q2[3] + q1[3] * q2[0] + q1[1] * q2[2] - q1[2] * q2[1],
            q1[1] * q2[3] + q1[3] * q2[1] + q1[2] * q2[0] - q1[0] * q2[2],
            q1[2] * q2[3] + q1[3] * q2[2] + q1[0] * q2[1] - q1[1] * q2[0],
            q1[3] * q2[3] + q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2]];
};

function quat4_norm(q) {
    return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
};

function quat4_normalize(q) {
    var n = Math.sqrt(quat4_norm(q));
    return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
};

// matrix math on mat3
function mat3_transform(m, v) {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
                m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
                m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}

function mat3_mul(m1, m2) {
    return [m1[0] * m2[0] + m1[1] * m2[3] + m1[2] * m2[6],
                m1[0] * m2[1] + m1[1] * m2[4] + m1[2] * m2[7],
                m1[0] * m2[2] + m1[1] * m2[5] + m1[2] * m2[8],
                m1[3] * m2[0] + m1[4] * m2[3] + m1[5] * m2[6],
                m1[3] * m2[1] + m1[4] * m2[4] + m1[5] * m2[7],
                m1[3] * m2[2] + m1[4] * m2[5] + m1[5] * m2[8],
                m1[6] * m2[0] + m1[7] * m2[3] + m1[8] * m2[6],
                m1[6] * m2[1] + m1[7] * m2[4] + m1[8] * m2[7],
                m1[6] * m2[2] + m1[7] * m2[5] + m1[8] * m2[8]];
};

function mat3_transpose(m) {
    return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
};

function mat3_getRow(m, r) {
    return [m[r * 3], m[r * 3 + 1], m[r * 3 + 2]];
};

function mat3_setRow(m, r, v) {
    if (r == 0) {
        return [v[0], v[1], v[2], m[3], m[4], m[5], m[6], m[7], m[8]];
    } else if (r == 1) {
        return [m[0], m[1], m[2], v[0], v[1], v[2], m[6], m[7], m[8]];
    } else if (r == 2) {
        return [m[0], m[1], m[2], m[3], m[4], m[5], v[0], v[1], v[2]];
    } else {
        return m;
    }
};

function mat3_identity() {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
};

// matrix math on mat4
function mat4_rotX(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
};

function mat4_rotY(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
};

function mat4_rotZ(angle) {
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};
/*
changed to use above
function mat4_transform(m, v) {
return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3] * v[3],
m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7] * v[3],
m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11] * v[3],
m[12] * v[0] + m[13] * v[1] + m[14] * v[2] + m[15] * v[3]];
};
*/
function mat4_mul(m1, m2) {
    

    return [m1[0] * m2[0] + m1[1] * m2[4] + m1[2] * m2[8] + m1[3] * m2[12],
            m1[0] * m2[1] + m1[1] * m2[5] + m1[2] * m2[9] + m1[3] * m2[13],
            m1[0] * m2[2] + m1[1] * m2[6] + m1[2] * m2[10] + m1[3] * m2[14],
            m1[0] * m2[3] + m1[1] * m2[7] + m1[2] * m2[11] + m1[3] * m2[15],
	        m1[4] * m2[0] + m1[5] * m2[4] + m1[6] * m2[8] + m1[7] * m2[12],
            m1[4] * m2[1] + m1[5] * m2[5] + m1[6] * m2[9] + m1[7] * m2[13],
            m1[4] * m2[2] + m1[5] * m2[6] + m1[6] * m2[10] + m1[7] * m2[14],
            m1[4] * m2[3] + m1[5] * m2[7] + m1[6] * m2[11] + m1[7] * m2[15],
	        m1[8] * m2[0] + m1[9] * m2[4] + m1[10] * m2[8] + m1[11] * m2[12],
            m1[8] * m2[1] + m1[9] * m2[5] + m1[10] * m2[9] + m1[11] * m2[13],
            m1[8] * m2[2] + m1[9] * m2[6] + m1[10] * m2[10] + m1[11] * m2[14],
            m1[8] * m2[3] + m1[9] * m2[7] + m1[10] * m2[11] + m1[11] * m2[15],
	        m1[12] * m2[0] + m1[13] * m2[4] + m1[14] * m2[8] + m1[15] * m2[12],
            m1[12] * m2[1] + m1[13] * m2[5] + m1[14] * m2[9] + m1[15] * m2[13],
            m1[12] * m2[2] + m1[13] * m2[6] + m1[14] * m2[10] + m1[15] * m2[14],
            m1[12] * m2[3] + m1[13] * m2[7] + m1[14] * m2[11] + m1[15] * m2[15]];
};

function mat4_getRotationScale(m) {
    return [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
};



function vec3_applyRotationMatrix(p_input, m) {   //<--------    this does not work correctly. attempting to apply a 4x4 to a 3

    var input = p_input;

    var cosY = Math.cos(input.y);

    input.y = Math.asin(m[2]);

    if (Math.abs(cosY) > 0.00001) {
        input.x = Math.atan2(-m[6] / cosY, m[8] / cosY);
        input.z = Math.atan2(-m[1] / cosY, m[0] / cosY);
    } else {
        input.x = 0;
        input.z = Math.atan2(m[5], m[6]);
    }

    return input;
}

var engine = new OBBEngine();
var start_time;

if (TIME >= 1)
  start_time = Date.now();

for(var timetick = 0; timetick < NUM_TICKS; timetick++)
  engine.Update(16.66666/1100, true);

if (TIME >= 1) {
  var elapsed = Date.now() - start_time;
  print("Par iteration completed", NUM_TICKS, "steps in", elapsed, "ms");
}

if (TIME >= 2) {
  start_time = Date.now();
  for(var timetick = 0; timetick < NUM_TICKS; timetick++)
    engine.Update(16.66666/1100, false);
  var elapsed = Date.now() - start_time;
  print("Seq iteration completed", NUM_TICKS, "steps in", elapsed, "ms");
}
