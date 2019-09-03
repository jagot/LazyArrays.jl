var documenterSearchIndex = {"docs":
[{"location":"#LazyArrays.jl-1","page":"Home","title":"LazyArrays.jl","text":"","category":"section"},{"location":"#","page":"Home","title":"Home","text":"Modules = [LazyArrays]\nPrivate = false","category":"page"},{"location":"#LazyArrays.LazyArrays","page":"Home","title":"LazyArrays.LazyArrays","text":"LazyArrays.jl\n\n(Image: Dev) (Image: Travis) (Image: codecov)\n\nLazy arrays and linear algebra in Julia\n\nThis package supports lazy analogues of array operations like vcat, hcat, and multiplication. This helps with the implementation of matrix-free methods for iterative solvers.\n\nThe package has been designed with high-performance in mind, so should outperform the non-lazy analogues from Base for many operations like copyto! and broadcasting. Some operations will be inherently slower due to extra computation, like getindex. Please file an issue for any examples that are significantly slower than their the analogue in Base.\n\nLazy operations\n\nTo construct a lazy representation of a function call f(x,y,z...), use the commandapplied(f, x, y, z...). This will return an unmaterialized object typically of typeAppliedthat represents the operation. To realize that object, callmaterialize, which  will typically be equivalent to callingf(x,y,z...). A macro@~` is available as a shorthand:\n\njulia> using LazyArrays, LinearAlgebra\n\njulia> applied(exp, 1)\nApplied(exp,1)\n\njulia> materialize(applied(exp, 1))\n2.718281828459045\n\njulia> materialize(@~ exp(1))\n2.718281828459045\n\njulia> exp(1)\n2.718281828459045\n\nThe benefit of lazy operations is that they can be materialized in-place,  possible using simplifications. For example, it is possible to  do BLAS-like Matrix-Vector operations of the form α*A*x + β*y as  implemented in BLAS.gemv! using a lazy applied object:\n\njulia> A = randn(5,5); b = randn(5); c = randn(5); d = similar(c);\n\njulia> d .= @~ 2.0 * A * b + 3.0 * c # Calls gemv!\n5-element Array{Float64,1}:\n -2.5366335879717514\n -5.305097174484744  \n -9.818431932350942  \n  2.421562605495651  \n  0.26792916096572983\n\njulia> 2*(A*b) + 3c\n5-element Array{Float64,1}:\n -2.5366335879717514\n -5.305097174484744  \n -9.818431932350942  \n  2.421562605495651  \n  0.26792916096572983\n\njulia> function mymul(A, b, c, d) # need to put in function for benchmarking\n       d .= @~ 2.0 * A * b + 3.0 * c\n       end\nmymul (generic function with 1 method)\n\njulia> @btime mymul(A, b, c, d) # calls gemv!\n  77.444 ns (0 allocations: 0 bytes)\n5-element Array{Float64,1}:\n -2.5366335879717514\n -5.305097174484744  \n -9.818431932350942  \n  2.421562605495651  \n  0.26792916096572983\n\njulia> @btime 2*(A*b) + 3c; # does not call gemv!\n  241.659 ns (4 allocations: 512 bytes)\n\nThis also works for inverses, which lower to BLAS calls whenever possible:\n\njulia> A = randn(5,5); b = randn(5); c = similar(b);\n\njulia> c .= @~ A \\ b\n5-element Array{Float64,1}:\n -2.5366335879717514\n -5.305097174484744  \n -9.818431932350942  \n  2.421562605495651  \n  0.26792916096572983\n\nLazy arrays\n\nOften we want lazy realizations of matrices, which are supported via ApplyArray. For example, the following creates a lazy matrix exponential:\n\njulia> E = ApplyArray(exp, [1 2; 3 4])\n2×2 ApplyArray{Float64,2,typeof(exp),Tuple{Array{Int64,2}}}:\n  51.969   74.7366\n 112.105  164.074 \n\nA lazy matrix exponential is useful for, say, in-place matrix-exponetial*vector:\n\njulia> b = Vector{Float64}(undef, 2); b .= @~ E*[4,4]\n2-element Array{Float64,1}:\n  506.8220830628333\n 1104.7145995988594\n ```\n While this works, it is not actually optimised (yet). \n\n Other options do have special implementations that make them fast. We\n now give some examples. \n\n\n### Concatenation\n\nLazy `vcat` and `hcat` allow for representing the concatenation of\nvectors without actually allocating memory, and support a fast\n`copyto!`  for allocation-free population of a vector.\n\njulia julia> using BenchmarkTools\n\njulia> A = ApplyArray(vcat,1:5,2:3) # allocation-free 7-element ApplyArray{Int64,1,typeof(vcat),Tuple{UnitRange{Int64},UnitRange{Int64}}}:  1  2  3  4  5  2  3\n\njulia> Vector(A) == vcat(1:5, 2:3) true\n\njulia> b = Array{Int}(undef, length(A)); @btime copyto!(b, A);   26.670 ns (0 allocations: 0 bytes)\n\njulia> @btime vcat(1:5, 2:3); # takes twice as long due to memory creation   43.336 ns (1 allocation: 144 bytes)\n\nSimilar is the lazy analogue of `hcat`:\n\njulia julia> A = ApplyArray(hcat, 1:3, randn(3,10)) 3×11 ApplyArray{Float64,2,typeof(hcat),Tuple{UnitRange{Int64},Array{Float64,2}}}:  1.0   1.16561    0.224871  -1.36416   -0.30675    0.103714    0.590141   0.982382  -1.50045    0.323747  -1.28173    2.0   1.04648    1.35506   -0.147157   0.995657  -0.616321   -0.128672  -0.671445  -0.563587  -0.268389  -1.71004    3.0  -0.433093  -0.325207  -1.38496   -0.391113  -0.0568739  -1.55796   -1.00747    0.473686  -1.2113     0.0119156\n\njulia> Matrix(A) == hcat(A.args...) true\n\njulia> B = Array{Float64}(undef, size(A)...); @btime copyto!(B, A);   109.625 ns (1 allocation: 32 bytes)\n\njulia> @btime hcat(A.args...); # takes twice as long due to memory creation   274.620 ns (6 allocations: 560 bytes)\n\n\n\n\n### Kronecker products\n\nWe can represent Kronecker products of arrays without constructing the full\narray:\n\n\njulia julia> A = randn(2,2); B = randn(3,3);\n\njulia> K = ApplyArray(kron,A,B) 6×6 ApplyArray{Float64,2,typeof(kron),Tuple{Array{Float64,2},Array{Float64,2}}}:  -1.08736   -0.19547   -0.132824   1.60531    0.288579    0.196093    0.353898   0.445557  -0.257776  -0.522472  -0.657791    0.380564   -0.723707   0.911737  -0.710378   1.06843   -1.34603     1.04876     1.40606    0.252761   0.171754  -0.403809  -0.0725908  -0.0493262  -0.457623  -0.576146   0.333329   0.131426   0.165464   -0.0957293   0.935821  -1.17896    0.918584  -0.26876    0.338588   -0.26381  \n\njulia> C = Matrix{Float64}(undef, 6, 6); @btime copyto!(C, K);   61.528 ns (0 allocations: 0 bytes)\n\njulia> C == kron(A,B) true\n\n\n\n## Broadcasting\n\nBase includes a lazy broadcast object called `Broadcasting`, but this is\nnot a subtype of `AbstractArray`. Here we have `BroadcastArray` which replicates\nthe functionality of `Broadcasting` while supporting the array interface.\n\njulia julia> A = randn(6,6);\n\njulia> B = BroadcastArray(exp, A);\n\njulia> Matrix(B) == exp.(A) true\n\njulia> B = BroadcastArray(+, A, 2);\n\njulia> B == A .+ 2 true\n\nSuch arrays can also be created using the macro `@~` which acts on ordinary \nbroadcasting expressions combined with `LazyArray`:\n\njulia julia> C = rand(1000)';\n\njulia> D = LazyArray(@~ exp.(C))\n\njulia> E = LazyArray(@~ @. 2 + log(C))\n\njulia> @btime sum(LazyArray(@~ C .* C'); dims=1) # without @~, 1.438 ms (5 allocations: 7.64 MiB)   74.425 μs (7 allocations: 8.08 KiB) ```\n\n\n\n\n\n","category":"module"},{"location":"#LazyArrays.LazyArray","page":"Home","title":"LazyArrays.LazyArray","text":"LazyArray(x::Applied) :: ApplyArray\nLazyArray(x::Broadcasted) :: BroadcastArray\n\nWrap a lazy object that wraps a computation producing an array to an array.\n\n\n\n\n\n","category":"type"},{"location":"#LazyArrays.cache-Union{Tuple{MT}, Tuple{Type{MT},AbstractArray}} where MT<:AbstractArray","page":"Home","title":"LazyArrays.cache","text":"cache(array::AbstractArray)\n\nCaches the entries of an array.\n\n\n\n\n\n","category":"method"},{"location":"#LazyArrays.@~-Tuple{Any}","page":"Home","title":"LazyArrays.@~","text":"@~ expr\n\nMacro for creating a Broadcasted or Applied object.  Regular calls like f(args...) inside expr are replaced with applied(f, args...). Dotted-calls like f(args...) inside expr are replaced with broadcasted.(f, args...).  Use LazyArray(@~ expr) if you need an array-based interface.\n\njulia> @~ A .+ B ./ 2\n\njulia> @~ @. A + B / 2\n\njulia> @~ A * B + C\n\n\n\n\n\n","category":"macro"},{"location":"internals/#Internals-1","page":"Internals","title":"Internals","text":"","category":"section"},{"location":"internals/#","page":"Internals","title":"Internals","text":"Modules = [LazyArrays]\nPublic = false","category":"page"},{"location":"internals/#LazyArrays.AbstractStridedLayout","page":"Internals","title":"LazyArrays.AbstractStridedLayout","text":"AbstractStridedLayout\n\nis an abstract type whose subtypes are returned by MemoryLayout(A) if an array A has storage laid out at regular offsets in memory, and which can therefore be passed to external C and Fortran functions expecting this memory layout.\n\nJulia's internal linear algebra machinery will automatically (and invisibly) dispatch to BLAS and LAPACK routines if the memory layout is BLAS compatible and the element type is a Float32, Float64, ComplexF32, or ComplexF64. In this case, one must implement the strided array interface, which requires overrides of strides(A::MyMatrix) and unknown_convert(::Type{Ptr{T}}, A::MyMatrix).\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.Add-Tuple","page":"Internals","title":"LazyArrays.Add","text":"Add(A1, A2, …, AN)\n\nA lazy representation of A1 + A2 + … + AN; i.e., a shorthand for applied(+, A1, A2, …, AN).\n\n\n\n\n\n","category":"method"},{"location":"internals/#LazyArrays.BroadcastLayout","page":"Internals","title":"LazyArrays.BroadcastLayout","text":"BroadcastLayout(f, layouts)\n\nis returned by MemoryLayout(A) if a matrix A is a BroadcastArray. f is a function that broadcast operation is applied and layouts is a tuple of MemoryLayout of the broadcasted arguments.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.ColumnMajor","page":"Internals","title":"LazyArrays.ColumnMajor","text":"ColumnMajor()\n\nis returned by MemoryLayout(A) if an array A has storage in memory as a column major array, so that stride(A,1) == 1 and stride(A,i) ≥ size(A,i-1) * stride(A,i-1) for 2 ≤ i ≤ ndims(A).\n\nArrays with ColumnMajor memory layout must conform to the DenseArray interface.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.DecreasingStrides","page":"Internals","title":"LazyArrays.DecreasingStrides","text":"DecreasingStrides()\n\nis returned by MemoryLayout(A) if an array A has storage in memory as a strided array with decreasing strides, so that stride(A,ndims(A)) ≥ 1 and stride(A,i) ≥ size(A,i+1) * stride(A,i+1)for1 ≤ i ≤ ndims(A)-1`.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.DenseColumnMajor","page":"Internals","title":"LazyArrays.DenseColumnMajor","text":"DenseColumnMajor()\n\nis returned by MemoryLayout(A) if an array A has storage in memory equivalent to an Array, so that stride(A,1) == 1 and stride(A,i) ≡ size(A,i-1) * stride(A,i-1) for 2 ≤ i ≤ ndims(A). In particular, if A is a matrix then strides(A) ==(1, size(A,1))`.\n\nArrays with DenseColumnMajor memory layout must conform to the DenseArray interface.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.DenseRowMajor","page":"Internals","title":"LazyArrays.DenseRowMajor","text":"DenseRowMajor()\n\nis returned by MemoryLayout(A) if an array A has storage in memory as a row major array with dense entries, so that stride(A,ndims(A)) == 1 and stride(A,i) ≡ size(A,i+1) * stride(A,i+1) for 1 ≤ i ≤ ndims(A)-1. In particular, if A is a matrix then strides(A) ==(size(A,2), 1)`.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.HermitianLayout","page":"Internals","title":"LazyArrays.HermitianLayout","text":"HermitianLayout(layout, uplo)\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory as a hermitianized version of layout, where the entries used are dictated by the uplo, which can be 'U' or L'.\n\nA matrix that has memory layout HermitianLayout(layout, uplo) must overrided hermitiandata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] == B[k,j] for j ≥ k if uplo == 'U' (j ≤ k if uplo == 'L') and A[k,j] == conj(B[j,k]) for j < k if uplo == 'U' (j > k if uplo == 'L').\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.IncreasingStrides","page":"Internals","title":"LazyArrays.IncreasingStrides","text":"IncreasingStrides()\n\nis returned by MemoryLayout(A) if an array A has storage in memory as a strided array with  increasing strides, so that stride(A,1) ≥ 1 and stride(A,i) ≥ size(A,i-1) * stride(A,i-1) for 2 ≤ i ≤ ndims(A).\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.LowerTriangularLayout","page":"Internals","title":"LazyArrays.LowerTriangularLayout","text":"LowerTriangularLayout(layout)\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory equivalent to a LowerTriangular(B) where B satisfies MemoryLayout(B) == layout.\n\nA matrix that has memory layout LowerTriangularLayout(layout) must overrided triangulardata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] ≡ zero(eltype(A)) for j > k and A[k,j] ≡ B[k,j] for j ≤ k.\n\nMoreover, transpose(A) and adjoint(A) must return a matrix that has memory layout UpperTriangularLayout.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.MemoryLayout-Tuple{Type}","page":"Internals","title":"LazyArrays.MemoryLayout","text":"MemoryLayout(A)\n\nspecifies the layout in memory for an array A. When you define a new AbstractArray type, you can choose to override MemoryLayout to indicate how an array is stored in memory. For example, if your matrix is column major with stride(A,2) == size(A,1), then override as follows:\n\nMemoryLayout(::MyMatrix) = DenseColumnMajor()\n\nThe default is UnknownLayout() to indicate that the layout in memory is unknown.\n\nJulia's internal linear algebra machinery will automatically (and invisibly) dispatch to BLAS and LAPACK routines if the memory layout is compatible.\n\n\n\n\n\n","category":"method"},{"location":"internals/#LazyArrays.RowMajor","page":"Internals","title":"LazyArrays.RowMajor","text":"RowMajor()\n\nis returned by MemoryLayout(A) if an array A has storage in memory as a row major array, so that stride(A,ndims(A)) == 1 and stride(A,i) ≥ size(A,i+1) * stride(A,i+1)for1 ≤ i ≤ ndims(A)-1`.\n\nIf A is a matrix  with RowMajor memory layout, then transpose(A) should return a matrix whose layout is ColumnMajor.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.ScalarLayout","page":"Internals","title":"LazyArrays.ScalarLayout","text":"ScalarLayout()\n\nis returned by MemoryLayout(A) if A is a scalar, which does not live in memory\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.StridedLayout","page":"Internals","title":"LazyArrays.StridedLayout","text":"StridedLayout()\n\nis returned by MemoryLayout(A) if an array A has storage laid out at regular offsets in memory. Arrays with StridedLayout must conform to the DenseArray interface.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.SymmetricLayout","page":"Internals","title":"LazyArrays.SymmetricLayout","text":"SymmetricLayout{layout}()\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory as a symmetrized version of layout, where the entries used are dictated by the uplo, which can be 'U' or L'.\n\nA matrix that has memory layout SymmetricLayout(layout, uplo) must overrided symmetricdata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] == B[k,j] for j ≥ k if uplo == 'U' (j ≤ k if uplo == 'L') and A[k,j] == B[j,k] for j < k if uplo == 'U' (j > k if uplo == 'L').\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.UnitLowerTriangularLayout","page":"Internals","title":"LazyArrays.UnitLowerTriangularLayout","text":"UnitLowerTriangularLayout(ML::MemoryLayout)\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory equivalent to a UnitLowerTriangular(B) where B satisfies MemoryLayout(B) == layout.\n\nA matrix that has memory layout UnitLowerTriangularLayout(layout) must overrided triangulardata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] ≡ zero(eltype(A)) for j > k, A[k,j] ≡ one(eltype(A)) for j == k, A[k,j] ≡ B[k,j] for j < k.\n\nMoreover, transpose(A) and adjoint(A) must return a matrix that has memory layout UnitUpperTriangularLayout.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.UnitUpperTriangularLayout","page":"Internals","title":"LazyArrays.UnitUpperTriangularLayout","text":"UnitUpperTriangularLayout(ML::MemoryLayout)\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory equivalent to a UpperTriangularLayout(B) where B satisfies MemoryLayout(B) == ML.\n\nA matrix that has memory layout UnitUpperTriangularLayout(layout) must overrided triangulardata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] ≡ B[k,j] for j > k, A[k,j] ≡ one(eltype(A)) for j == k, A[k,j] ≡ zero(eltype(A)) for j < k.\n\nMoreover, transpose(A) and adjoint(A) must return a matrix that has memory layout UnitLowerTriangularLayout.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.UnknownLayout","page":"Internals","title":"LazyArrays.UnknownLayout","text":"UnknownLayout()\n\nis returned by MemoryLayout(A) if it is unknown how the entries of an array A are stored in memory.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.UpperTriangularLayout","page":"Internals","title":"LazyArrays.UpperTriangularLayout","text":"UpperTriangularLayout(ML::MemoryLayout)\n\nis returned by MemoryLayout(A) if a matrix A has storage in memory equivalent to a UpperTriangularLayout(B) where B satisfies MemoryLayout(B) == ML.\n\nA matrix that has memory layout UpperTriangularLayout(layout) must overrided triangulardata(A) to return a matrix B such that MemoryLayout(B) == layout and A[k,j] ≡ B[k,j] for j ≥ k and A[k,j] ≡ zero(eltype(A)) for j < k.\n\nMoreover, transpose(A) and adjoint(A) must return a matrix that has memory layout LowerTriangularLayout.\n\n\n\n\n\n","category":"type"},{"location":"internals/#LazyArrays.colsupport-Tuple{Any,Any}","page":"Internals","title":"LazyArrays.colsupport","text":"\"     colsupport(A, j)\n\ngives an iterator containing the possible non-zero entries in the j-th column of A.\n\n\n\n\n\n","category":"method"},{"location":"internals/#LazyArrays.lmaterialize-Tuple{Applied{Style,typeof(*),Factors} where Factors<:Tuple where Style}","page":"Internals","title":"LazyArrays.lmaterialize","text":"lmaterialize(M::Mul)\n\nmaterializes arrays iteratively, left-to-right.\n\n\n\n\n\n","category":"method"},{"location":"internals/#LazyArrays.rowsupport-Tuple{Any,Any}","page":"Internals","title":"LazyArrays.rowsupport","text":"\"     rowsupport(A, k)\n\ngives an iterator containing the possible non-zero entries in the k-th row of A.\n\n\n\n\n\n","category":"method"}]
}
